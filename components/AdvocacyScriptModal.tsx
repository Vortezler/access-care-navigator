"use client";

import { useEffect, useRef, useState } from "react";
import type { Clinic, IntakeData, TextSource } from "@/lib/types";
import { buildIcsString, nextBusinessMorning } from "@/lib/ics";
import { formatSlot } from "@/lib/session";
import Dialog from "./Dialog";
import { Calendar, Copy, Sparkle } from "./Icons";

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

const SOURCE_LABEL: Record<TextSource, string> = {
  bedrock: "Written by Claude via AWS Bedrock",
  anthropic: "Written by Claude via the Anthropic API",
  template: "Built from our standard script (AI unavailable)",
};

export default function AdvocacyScriptModal({ clinic, intake, open, onClose }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const cache = useRef(new Map<string, { script: string; source: TextSource }>());

  useEffect(() => {
    if (!open || !clinic) return;
    setCopied(false);
    const hit = cache.current.get(clinic.id);
    if (hit) {
      setState({ kind: "ready", ...hit });
      return;
    }
    setState({ kind: "loading" });
    const ctrl = new AbortController();
    fetch("/api/advocacy-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinicId: clinic.id, intakeData: intake }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const json = (await res.json()) as { script?: string; source?: TextSource; errors?: string[] };
        if (!res.ok || !json.script) throw new Error(json.errors?.join(" ") || "Couldn't generate a script.");
        const value = { script: json.script, source: json.source ?? "template" };
        cache.current.set(clinic.id, value);
        setState({ kind: "ready", ...value });
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setState({ kind: "error", message: err.message });
      });
    return () => ctrl.abort();
  }, [open, clinic, intake, attempt]);

  const reminder = nextBusinessMorning();

  function downloadIcs() {
    if (!clinic) return;
    const ics = buildIcsString(clinic.name, clinic.phone, reminder.toISOString());
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-${clinic.id}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

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
      title={clinic ? `Your call script for ${clinic.name}` : ""}
      subtitle={
        clinic ? (
          <>
            Read it as-is or make it yours. Call{" "}
            <a href={`tel:${clinic.phone.replace(/[^\d+]/g, "")}`}>{clinic.phone}</a>.
          </>
        ) : undefined
      }
    >
      <div role="status" aria-live="polite" className="visually-hidden">
        {state.kind === "loading" ? "Writing your call script…" : state.kind === "ready" ? "Your call script is ready." : ""}
        {copied ? " Script copied to clipboard." : ""}
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
          <h2>We couldn&rsquo;t write the script</h2>
          <p style={{ margin: "0 0 12px" }}>{state.message}</p>
          <button type="button" className="btn btn--secondary" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}

      {state.kind === "ready" && (
        <div className="reveal">
          <label htmlFor="script-text" className="visually-hidden">
            Your call script
          </label>
          <textarea id="script-text" className="script" readOnly value={state.script} />
          <p className="source-tag">
            <Sparkle />
            {SOURCE_LABEL[state.source]}
          </p>
          <div className="dialog__footer">
            <button type="button" className="btn btn--primary" onClick={() => copy(state.script)}>
              <Copy />
              {copied ? "Copied" : "Copy script"}
            </button>
            <button type="button" className="btn btn--secondary" onClick={downloadIcs}>
              <Calendar />
              Download calendar reminder (.ics)
            </button>
          </div>
          <p className="muted" style={{ margin: "12px 0 0", fontSize: "0.875rem" }}>
            The reminder is set for {formatSlot(reminder.toISOString())}, when most front desks are open.
          </p>
        </div>
      )}
    </Dialog>
  );
}
