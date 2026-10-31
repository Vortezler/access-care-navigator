"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatAction, ChatReply } from "@/lib/care-guide";
import type { Recognition } from "@/lib/voice";
import { claim, errorKey, getRecognitionCtor, release } from "@/lib/voice";
import { loadSession } from "@/lib/session";
import { useA11y } from "./A11yProvider";
import { useI18n } from "./I18nProvider";
import GuideActionCard from "./GuideActionCard";
import VoiceInput from "./VoiceInput";
import { Alert, Chat, FileDoc, Mic, Paperclip, Send, Sparkle, Stop } from "./Icons";

interface Doc {
  name: string;
  size: number;
  data: string; // base64
}

interface Msg {
  id: number;
  role: "user" | "assistant";
  text: string;
  docs?: Doc[];
  actions?: ChatAction[];
  memory?: string;
  source?: ChatReply["source"];
}

type VoiceMode = "off" | "listening" | "thinking" | "speaking" | "paused";

const MAX_FILE = 10 * 1024 * 1024;
const MAX_PER_MSG = 3;
const AUTOREAD_KEY = "acn:autoread";

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function CareGuide() {
  const { t, lang, speech } = useI18n();
  const g = t.guide;
  const { readText, stop: stopSpeaking, speechSupported } = useA11y();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [autoRead, setAutoRead] = useState(false);
  const [voice, setVoice] = useState<VoiceMode>("off");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [recSupported, setRecSupported] = useState(false);

  const speaking = useRef(false);
  const spokenReply = useRef("");
  const request = useRef<AbortController | null>(null);
  const nextId = useRef(1);
  const messagesRef = useRef<Msg[]>([]);
  messagesRef.current = messages;
  const voiceOn = useRef(false);
  const rec = useRef<Recognition | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const dictationBase = useRef("");

  useEffect(() => {
    setRecSupported(Boolean(getRecognitionCtor()));
    try {
      setAutoRead(localStorage.getItem(AUTOREAD_KEY) === "1");
    } catch {
      /* storage blocked */
    }
    return () => {
      voiceOn.current = false;
      rec.current?.abort();
      request.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Keep the newest message in view
  useEffect(() => {
    const reduced =
      document.documentElement.dataset.motion === "reduce" || matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ block: "end", behavior: reduced ? "auto" : "smooth" });
  }, [messages, busy]);

  // ---------- Sending ----------

  const listenRef = useRef<() => void>(() => {});

  const speakReply = useCallback(
    (text: string) => {
      speaking.current = true;
      spokenReply.current = text;
      listenRef.current();
      setVoice("speaking");
      readText(text, g.voiceSpeaking, () => {
        speaking.current = false;
        if (voiceOn.current) setVoice("listening");
        else setVoice("off");
      });
    },
    [readText, g.voiceSpeaking],
  );

  const send = useCallback(
    async (text: string, attach: Doc[] = []) => {
      const clean = text.trim();
      if (!clean && !attach.length) return;
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      speaking.current = false;
      stopSpeaking();
      setError(null);
      const userMsg: Msg = { id: nextId.current++, role: "user", text: clean, docs: attach };
      const history = [...messagesRef.current, userMsg];
      messagesRef.current = history;
      setMessages(history);
      setInput("");
      setDocs([]);
      setBusy(true);
      if (voiceOn.current) setVoice("thinking");

      try {
        const res = await fetch("/api/chat", {
          signal: controller.signal,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lang,
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            profile: loadSession()?.intake ?? null,
            messages: history.map((m) => ({
              role: m.role,
              text: m.text,
              docs: m.docs?.map((d) => ({ name: d.name, data: d.data })),
              memory: m.memory,
            })),
          }),
        });
        if (controller.signal.aborted) return;
        const json = (await res.json()) as Partial<ChatReply> & { errors?: string[] };
        if (!res.ok || typeof json.reply !== "string") throw new Error(json.errors?.join(" ") || g.error);
        const reply: Msg = {
          id: nextId.current++,
          role: "assistant",
          text: json.reply,
          actions: json.actions ?? [],
          memory: json.memory,
          source: json.source,
        };
        if (controller.signal.aborted) return;
        messagesRef.current = [...messagesRef.current, reply];
        setMessages(messagesRef.current);
        if (voiceOn.current) speakReply(json.reply);
        else if (autoRead && speechSupported) readText(json.reply, g.voiceSpeaking);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError((err as Error).message || g.error);
        if (voiceOn.current) setVoice("paused");
      } finally {
        if (request.current === controller) {
          request.current = null;
          setBusy(false);
        }
      }
    },
    [lang, g.error, g.voiceSpeaking, autoRead, speechSupported, readText, speakReply, stopSpeaking],
  );

  // ---------- Hands-free voice conversation ----------

  const listen = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || !voiceOn.current) return;
    if (rec.current) return;
    const r = new Ctor();
    r.lang = speech;
    r.continuous = false; // one utterance per turn; the browser ends it after a pause
    r.interimResults = true;
    let finalText = "";
    let heardText = "";
    let failed = false;
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      const candidate = (finalText + interim).trim();
      // Ignore recognizable speaker echo. Headphones give the most reliable barge-in.
      const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
      if (speaking.current && normalize(candidate) && normalize(spokenReply.current).includes(normalize(candidate))) {
        finalText = "";
        return;
      }
      if (candidate) {
        heardText = candidate;
        if (speaking.current) {
          speaking.current = false;
          stopSpeaking();
        }
        request.current?.abort();
        request.current = null;
        setBusy(false);
        setVoice("listening");
        setInput(candidate);
      }
    };
    r.onerror = (e) => {
      if (e.error === "aborted" || e.error === "no-speech") return;
      failed = true;
      setVoiceError(t.voice.errors[errorKey(e.error)]);
    };
    r.onend = () => {
      release(r);
      if (rec.current !== r) return;
      rec.current = null;
      if (!voiceOn.current) return;
      if (failed) { setVoice("paused"); return; }
      if (heardText.trim()) void send(heardText);
      window.setTimeout(() => { if (voiceOn.current) listenRef.current(); }, 150);
    };
    claim(r);
    rec.current = r;
    setVoiceError(null);
    if (!speaking.current && !request.current) setVoice("listening");
    try {
      r.start();
    } catch {
      release(r);
      rec.current = null;
      setVoice("paused");
    }
  }, [speech, stopSpeaking, send, t.voice.errors]);
  listenRef.current = listen;

  function startVoice() {
    voiceOn.current = true;
    listen();
  }

  function endVoice() {
    voiceOn.current = false;
    rec.current?.abort();
    rec.current = null;
    speaking.current = false;
    stopSpeaking();
    setVoice("off");
  }

  // ---------- Attachments ----------

  async function addFiles(list: FileList | null) {
    if (!list) return;
    setFileError(null);
    const files = Array.from(list);
    if (docs.length + files.length > MAX_PER_MSG) {
      setFileError(g.tooMany);
      return;
    }
    const added: Doc[] = [];
    for (const f of files) {
      if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
        setFileError(g.notPdf(f.name));
        continue;
      }
      if (f.size > MAX_FILE) {
        setFileError(g.tooBig(f.name));
        continue;
      }
      added.push({ name: f.name, size: f.size, data: await readAsBase64(f) });
    }
    setDocs((d) => [...d, ...added]);
  }

  function newChat() {
    endVoice();
    request.current?.abort();
    request.current = null;
    setBusy(false);
    messagesRef.current = [];
    setMessages([]);
    setDocs([]);
    setInput("");
    setError(null);
  }

  const voiceStatus: Record<Exclude<VoiceMode, "off">, string> = {
    listening: g.voiceListening,
    thinking: g.voiceThinking,
    speaking: g.voiceSpeaking,
    paused: g.voicePaused,
  };

  return (
    <div className="guide">
      <div className="guide__intro">
        <p className="eyebrow reveal">
          <Chat size={16} />
          {g.title}
        </p>
        <h1 className="display reveal" style={{ ["--i" as string]: 1 }}>
          {g.title}
        </h1>
        <p className="lede reveal" style={{ ["--i" as string]: 1 }}>
          {g.subtitle}
        </p>
        <p className="disclaimer reveal" style={{ ["--i" as string]: 2 }}>
          <Alert size={16} />
          <span>{g.disclaimer}</span>
        </p>
      </div>

      <div className="chat-log panel" role="log" aria-label={g.logLabel} aria-live="polite" aria-relevant="additions">
        <article className="msg msg--guide">
          <p className="msg__who">{g.guide}</p>
          <p className="msg__text">{g.welcome}</p>
          {messages.length === 0 && (
            <div className="starters">
              {g.starters.map((s) => (
                <button key={s} type="button" className="btn btn--secondary starter" onClick={() => void send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </article>

        {messages.map((m) => (
          <article key={m.id} className={`msg msg--${m.role === "user" ? "user" : "guide"}`}>
            <p className="msg__who">{m.role === "user" ? g.you : g.guide}</p>
            {!!m.docs?.length && (
              <ul className="doc-chips" aria-label={g.attached(m.docs.length)}>
                {m.docs.map((d) => (
                  <li key={d.name} className="doc-chip">
                    <FileDoc />
                    {d.name}
                  </li>
                ))}
              </ul>
            )}
            {m.text && <p className="msg__text">{m.text}</p>}
            {m.actions?.map((a, i) => <GuideActionCard key={i} action={a} />)}
            {m.source === "template" && (
              <p className="source-tag">
                <Alert size={14} /> {g.unavailable}
              </p>
            )}
            {m.source && m.source !== "template" && (
              <p className="source-tag">
                <Sparkle /> Claude
              </p>
            )}
          </article>
        ))}

        {busy && (
          <article className="msg msg--guide" aria-busy="true">
            <p className="msg__who">{g.guide}</p>
            <p className="msg__text thinking">
              <span className="dots" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              <span role="status">{g.thinking}</span>
            </p>
          </article>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <div className="composer">
        {/* Hands-free conversation */}
        <div className="voice-bar">
          {recSupported ? (
            voice === "off" ? (
              <button type="button" className="btn btn--secondary" onClick={startVoice}>
                <Mic />
                {g.voiceStart}
              </button>
            ) : (
              <>
                <span className={`voice-state voice-state--${voice}`} role="status" aria-live="assertive">
                  <span className="voice-orb" aria-hidden />
                  {voiceStatus[voice]}
                </span>
                {voice === "paused" && (
                  <button type="button" className="btn btn--primary" onClick={listen}>
                    <Mic />
                    {g.voiceListening}
                  </button>
                )}
                {voice === "speaking" && (
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => {
                      speaking.current = false;
                      stopSpeaking();
                      setVoice("listening");
                      listen();
                    }}
                  >
                    <Stop />
                    {g.stopSpeaking}
                  </button>
                )}
                <button type="button" className="btn btn--ghost" onClick={endVoice}>
                  {g.voiceEnd}
                </button>
              </>
            )
          ) : (
            <span className="field__help">{g.voiceUnsupported}</span>
          )}
          {speechSupported && voice === "off" && (
            <label className="toggle">
              <input
                type="checkbox"
                checked={autoRead}
                onChange={(e) => {
                  setAutoRead(e.target.checked);
                  try {
                    localStorage.setItem(AUTOREAD_KEY, e.target.checked ? "1" : "0");
                  } catch {
                    /* storage blocked */
                  }
                }}
              />
              <span>{g.autoRead}</span>
            </label>
          )}
          {messages.length > 0 && (
            <button type="button" className="btn btn--ghost new-chat" onClick={newChat}>
              {g.newChat}
            </button>
          )}
        </div>
        {voiceError && (
          <p className="field__error" role="alert">
            {voiceError}
          </p>
        )}

        <form
          className="composer__form"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input, docs);
          }}
        >
          {docs.length > 0 && (
            <ul className="doc-chips" aria-label={g.attached(docs.length)}>
              {docs.map((d) => (
                <li key={d.name} className="doc-chip">
                  <FileDoc />
                  {d.name} <span className="muted">· {kb(d.size)}</span>
                  <button
                    type="button"
                    className="doc-chip__remove"
                    aria-label={g.remove(d.name)}
                    onClick={() => setDocs((all) => all.filter((x) => x !== d))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="composer__row">
            <label className="btn btn--secondary composer__attach">
              <Paperclip />
              <span className="btn__label">{g.attach}</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="visually-hidden"
                aria-describedby="attach-hint"
                onChange={(e) => {
                  void addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <div className="with-mic composer__input">
              <textarea
                id="chat-input"
                className="textarea"
                rows={2}
                aria-label={g.inputLabel}
                placeholder={g.placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send(input, docs);
                  }
                }}
              />
              {voice === "off" && <VoiceInput
                fieldLabel={g.inputLabel}
                targetId="chat-input"
                continuous
                onStart={() => {
                  dictationBase.current = input;
                }}
                onTranscript={(spoken) => setInput(dictationBase.current ? `${dictationBase.current.trimEnd()} ${spoken}` : spoken)}
              />}
            </div>
            <button type="submit" className="btn btn--primary" disabled={busy || (!input.trim() && !docs.length)}>
              <Send />
              <span className="btn__label">{g.send}</span>
            </button>
          </div>
          <p className="field__help" id="attach-hint">
            {g.attachHint}
          </p>
          {fileError && (
            <p className="field__error" role="alert">
              {fileError}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
