"use client";

import { useEffect, useRef, useState } from "react";
import type { Clinic, IntakeData, TextSource } from "@/lib/types";
import { callReminderEvent, nextBusinessMorning } from "@/lib/ics";
import Dialog from "./Dialog";
import CalendarActions from "./CalendarActions";
import { useA11y } from "./A11yProvider";
import { useI18n } from "./I18nProvider";
import { Copy, Sparkle, Speaker } from "./Icons";

interface Props {
  clinic: Clinic | null;
  intake: IntakeData;
  open: boolean;
  onClose: () => void;
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; script: string; source: TextSource }
  | { kind: "error"; message: string };

export default function AdvocacyScriptModal({ clinic, intake, open, onClose }: Props) {
  const { t, lang, formatSlot } = useI18n();
  const sc = t.script;
  const [state, setState] = useState<State>({ kind: "loading" });
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { speechSupported, readText, readState, stop } = useA11y();
  const cache = useRef(new Map<string, { script: string; source: TextSource }>());
  const failed = sc.failed;

  useEffect(() => {
    if (!open || !clinic) return;
    setCopied(false);
    const key = `${clinic.id}:${lang}`; // a script per language
    const hit = cache.current.get(key);
    if (hit) {
      setState({ kind: "ready", ...hit });
      return;
    }
    setState({ kind: "loading" });
    const ctrl = new AbortController();
    fetch("/api/advocacy-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinicId: clinic.id, intakeData: intake, lang }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const json = (await res.json()) as { script?: string; source?: TextSource; errors?: string[] };
        if (!res.ok || !json.script) throw new Error(json.errors?.join(" ") || failed);
        const value = { script: json.script, source: json.source ?? "template" };
        cache.current.set(key, value);
        setState({ kind: "ready", ...value });
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setState({ kind: "error", message: err.message });
      });
    return () => ctrl.abort();
  }, [open, clinic, intake, attempt, lang, failed]);

  const reminder = nextBusinessMorning();

  async function copy(script: string) {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      /* clipboard blocked — the text is still selectable */
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={clinic ? sc.title(clinic.name) : ""}
      subtitle={
        clinic ? (
          <>
            {sc.subtitle} <a href={`tel:${clinic.phone.replace(/[^\d+]/g, "")}`}>{clinic.phone}</a>.
          </>
        ) : undefined
      }
    >
      <div role="status" aria-live="polite" className="visually-hidden">
        {state.kind === "loading" ? sc.writing : state.kind === "ready" ? sc.ready : ""}
        {copied ? ` ${sc.copiedStatus}` : ""}
      </div>

      {state.kind === "loading" && (
        <div className="skeleton" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      )}

      {state.kind === "error" && (
        <div className="alert" role="alert">
          <h2>{sc.errorTitle}</h2>
          <p style={{ margin: "0 0 12px" }}>{state.message}</p>
          <button type="button" className="btn btn--secondary" onClick={() => setAttempt((n) => n + 1)}>
            {sc.tryAgain}
          </button>
        </div>
      )}

      {state.kind === "ready" && (
        <div className="reveal">
          <label htmlFor="script-text" className="visually-hidden">
            {sc.label}
          </label>
          <textarea id="script-text" className="script" readOnly value={state.script} />
          <p className="source-tag">
            <Sparkle />
            {sc.source[state.source]}
          </p>
          <div className="dialog__footer">
            <button type="button" className="btn btn--primary" onClick={() => copy(state.script)}>
              <Copy />
              {copied ? sc.copied : sc.copy}
            </button>
            {speechSupported && (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => (readState === "idle" ? readText(state.script, sc.readingLabel) : stop())}
              >
                <Speaker />
                {readState === "idle" ? sc.listen : sc.stopListen}
              </button>
            )}
          </div>
          <h3 className="clinic__subhead" style={{ margin: "22px 0 10px" }}>
            {sc.remind}
          </h3>
          {clinic && (
            <CalendarActions
              event={callReminderEvent(clinic.name, clinic.phone, reminder.toISOString(), t.events)}
              filename={`call-${clinic.id}.ics`}
              noun="reminder"
            />
          )}
          <p className="muted" style={{ margin: "12px 0 0", fontSize: "0.875rem" }}>
            {sc.reminderAt(formatSlot(reminder.toISOString()))}
          </p>
        </div>
      )}
    </Dialog>
  );
}
