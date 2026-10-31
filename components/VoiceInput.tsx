"use client";

import { useEffect, useRef, useState } from "react";
import type { Recognition } from "@/lib/voice";
import { claim, errorKey, getRecognitionCtor, release } from "@/lib/voice";
import { useA11y } from "./A11yProvider";
import { useI18n } from "./I18nProvider";
import { Mic } from "./Icons";

interface Props {
  /** Field name for the button's accessible label, e.g. "your name" */
  fieldLabel: string;
  /** id of the field this fills, so focus can return there */
  targetId: string;
  /** Called with live (interim) and final transcripts */
  onTranscript: (text: string, isFinal: boolean) => void;
  /** Long fields keep listening until stopped; short fields stop after one phrase */
  continuous?: boolean;
  /** Called as listening begins (e.g. to remember existing text to append to) */
  onStart?: () => void;
}

/**
 * Mic button that sits beside a field. Press to talk, press again to stop.
 * Hidden entirely in browsers without speech recognition.
 */
export default function VoiceInput({ fieldLabel, targetId, onTranscript, continuous = false, onStart }: Props) {
  const { stop: stopReading } = useA11y();
  const { t, speech } = useI18n();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    setSupported(Boolean(getRecognitionCtor()));
    return () => rec.current?.abort();
  }, []);

  if (!supported) return null;

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    stopReading(); // don't let read-aloud talk into the microphone
    onStart?.();
    const r = new Ctor();
    r.lang = speech;
    r.continuous = continuous;
    r.interimResults = true;
    let finalText = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (interim) onTranscriptRef.current((finalText + interim).trim(), false);
      else if (finalText) onTranscriptRef.current(finalText.trim(), true);
    };
    r.onerror = (e) => {
      if (e.error === "aborted") return;
      setError(t.voice.errors[errorKey(e.error)]);
    };
    r.onend = () => {
      release(r);
      setListening(false);
      setStatus(finalText ? t.voice.got(finalText.trim()) : "");
      document.getElementById(targetId)?.focus();
    };
    claim(r);
    rec.current = r;
    setError(null);
    setStatus(t.voice.listening(fieldLabel));
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
      setError(t.voice.errors.generic);
    }
  }

  function stop() {
    rec.current?.stop();
  }

  return (
    <>
      <button
        type="button"
        className={`mic${listening ? " mic--on" : ""}`}
        aria-label={listening ? t.voice.stop(fieldLabel) : t.voice.speak(fieldLabel)}
        title={listening ? t.voice.stopTitle : t.voice.title}
        onClick={listening ? stop : start}
      >
        <Mic />
      </button>
      <span className="visually-hidden" role="status" aria-live="polite">
        {status}
      </span>
      {error && (
        <span className="field__error mic__error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
