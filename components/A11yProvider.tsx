"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Prefs } from "@/lib/prefs";
import { DEFAULT_PREFS, applyPrefs, loadPrefs, savePrefs } from "@/lib/prefs";

export type ReadState = "idle" | "playing" | "paused";

interface Chunk {
  text: string;
  el?: Element;
}

interface A11yContextValue {
  prefs: Prefs;
  setPrefs: (patch: Partial<Prefs>) => void;
  resetPrefs: () => void;
  // read aloud
  speechSupported: boolean;
  voices: SpeechSynthesisVoice[];
  readState: ReadState;
  readLabel: string;
  readPage: () => void;
  readText: (text: string, label: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

const A11yContext = createContext<A11yContextValue | null>(null);

export function useA11y() {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error("useA11y must be used inside <A11yProvider>");
  return ctx;
}

// Blocks we read one at a time, so each can be highlighted as it is spoken.
const BLOCKS = "h1,h2,h3,h4,p,li,legend,label,dt,dd,textarea,.badge";

function collectChunks(root: Element): Chunk[] {
  const out: Chunk[] = [];
  root.querySelectorAll(BLOCKS).forEach((el) => {
    if (el.closest('[aria-hidden="true"],[data-noread],.read-bar')) return;
    if (el.querySelector(BLOCKS)) return; // a parent of other blocks: read the children instead
    if (el.closest(".badges") && !el.matches(".badge")) return;
    let text: string;
    if (el instanceof HTMLTextAreaElement) text = el.value;
    else text = (el as HTMLElement).innerText ?? el.textContent ?? "";
    // Say the state of checkboxes and radios, like a screen reader would
    const input = el.querySelector<HTMLInputElement>('input[type="checkbox"],input[type="radio"]');
    if (input) text = `${input.checked ? "Selected" : "Not selected"}: ${text}`;
    // ...and what's typed into a text field
    if (el instanceof HTMLLabelElement && el.htmlFor) {
      const ctl = document.getElementById(el.htmlFor);
      if (ctl instanceof HTMLSelectElement) text += `: ${ctl.value ? ctl.selectedOptions[0]?.text : "nothing chosen"}`;
      else if (ctl instanceof HTMLInputElement || ctl instanceof HTMLTextAreaElement) text += `: ${ctl.value || "empty"}`;
    }
    text = text.replace(/\s+/g, " ").trim();
    if (text) out.push({ text, el });
  });
  return out;
}

export default function A11yProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [readState, setReadState] = useState<ReadState>("idle");
  const [readLabel, setReadLabel] = useState("");
  const runId = useRef(0);
  const highlighted = useRef<Element | null>(null);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const pathname = usePathname();

  useEffect(() => {
    const p = loadPrefs();
    setPrefsState(p);
    applyPrefs(p);
    if (!("speechSynthesis" in window)) return;
    setSpeechSupported(true);
    const load = () => setVoices(window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en")));
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    const stopOnLeave = () => window.speechSynthesis.cancel();
    window.addEventListener("pagehide", stopOnLeave);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.removeEventListener("pagehide", stopOnLeave);
      window.speechSynthesis.cancel();
    };
  }, []);

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      applyPrefs(next);
      return next;
    });
  }, []);

  const resetPrefs = useCallback(() => {
    savePrefs(DEFAULT_PREFS);
    applyPrefs(DEFAULT_PREFS);
    setPrefsState(DEFAULT_PREFS);
  }, []);

  const clearHighlight = () => {
    highlighted.current?.classList.remove("reading-now");
    highlighted.current = null;
  };

  const stop = useCallback(() => {
    runId.current++;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    clearHighlight();
    setReadState("idle");
    setReadLabel("");
  }, []);

  const speak = useCallback(
    (chunks: Chunk[], label: string) => {
      const synth = window.speechSynthesis;
      synth.cancel();
      clearHighlight();
      if (!chunks.length) return;
      const id = ++runId.current;
      const { speechRate, voiceURI } = prefsRef.current;
      const voice = synth.getVoices().find((v) => v.voiceURI === voiceURI);
      const reduced =
        document.documentElement.dataset.motion === "reduce" || matchMedia("(prefers-reduced-motion: reduce)").matches;

      chunks.forEach((c, i) => {
        const u = new SpeechSynthesisUtterance(c.text);
        u.rate = speechRate;
        if (voice) u.voice = voice;
        u.lang = voice?.lang || document.documentElement.lang || "en-US";
        u.onstart = () => {
          if (id !== runId.current) return;
          clearHighlight();
          if (c.el) {
            c.el.classList.add("reading-now");
            highlighted.current = c.el;
            c.el.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
          }
        };
        const done = () => {
          if (id !== runId.current) return;
          clearHighlight();
          setReadState("idle");
          setReadLabel("");
        };
        if (i === chunks.length - 1) u.onend = done;
        u.onerror = (e) => {
          if (e.error !== "interrupted" && e.error !== "canceled") return done();
          // Cancelled by someone other than us (OS, another tab): reset once the queue is empty.
          setTimeout(() => {
            if (!synth.speaking && !synth.pending) done();
          }, 0);
        };
        synth.speak(u);
      });
      setReadState("playing");
      setReadLabel(label);
    },
    [],
  );

  const readPage = useCallback(() => {
    // If a dialog is open, that's what the person is looking at.
    const root = document.querySelector("dialog[open]") ?? document.getElementById("main");
    if (root) speak(collectChunks(root), root.tagName === "DIALOG" ? "Reading this dialog" : "Reading this page");
  }, [speak]);

  const readText = useCallback(
    (text: string, label: string) => {
      const chunks = text
        .split(/\n\s*\n|\n(?=\s*•)/)
        .map((t) => t.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .map((t) => ({ text: t }));
      speak(chunks, label);
    },
    [speak],
  );

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setReadState("paused");
  }, []);
  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setReadState("playing");
  }, []);

  // Leaving the page ends the reading.
  useEffect(() => {
    stop();
  }, [pathname, stop]);

  return (
    <A11yContext.Provider
      value={{
        prefs,
        setPrefs,
        resetPrefs,
        speechSupported,
        voices,
        readState,
        readLabel,
        readPage,
        readText,
        pause,
        resume,
        stop,
      }}
    >
      {children}
    </A11yContext.Provider>
  );
}
