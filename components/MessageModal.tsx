"use client";

import { useEffect, useRef, useState } from "react";
import type { Clinic, IntakeData, TextSource } from "@/lib/types";
import type { Channel, ClinicMessage } from "@/lib/ai-client";
import Dialog from "./Dialog";
import MessageDraft from "./MessageDraft";
import { useI18n } from "./I18nProvider";
import { Sparkle } from "./Icons";

interface Props {
  clinic: Clinic | null;
  intake: IntakeData;
  open: boolean;
  onClose: () => void;
}

type Draft = ClinicMessage & { to: string; source: TextSource };
type State = { kind: "loading" } | ({ kind: "ready" } & Draft) | { kind: "error"; message: string };

export default function MessageModal({ clinic, intake, open, onClose }: Props) {
  const { t, lang } = useI18n();
  const m = t.msg;
  const [channel, setChannel] = useState<Channel>("email");
  const [state, setState] = useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const cache = useRef(new Map<string, Draft>());
  const failed = m.failed;

  useEffect(() => {
    if (!open || !clinic) return;
    const key = `${clinic.id}:${channel}:${lang}`;
    const hit = cache.current.get(key);
    if (hit) {
      setState({ kind: "ready", ...hit });
      return;
    }
    setState({ kind: "loading" });
    const ctrl = new AbortController();
    fetch("/api/draft-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinicId: clinic.id, intakeData: intake, channel, lang }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const json = (await res.json()) as Partial<Draft> & { errors?: string[] };
        if (!res.ok || !json.body || !json.to) throw new Error(json.errors?.join(" ") || failed);
        const draft: Draft = { subject: json.subject ?? "", body: json.body, to: json.to, source: json.source ?? "template" };
        cache.current.set(key, draft);
        setState({ kind: "ready", ...draft });
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setState({ kind: "error", message: err.message });
      });
    return () => ctrl.abort();
  }, [open, clinic, intake, channel, lang, attempt, failed]);

  return (
    <Dialog open={open} onClose={onClose} title={clinic ? m.title(clinic.name) : ""} subtitle={m.subtitle}>
      <fieldset className="segmented" style={{ marginBottom: 16 }}>
        <legend className="visually-hidden">{m.channel}</legend>
        {(["email", "sms"] as const).map((c) => (
          <label className="segmented__opt" key={c}>
            <input type="radio" name="msg-channel" checked={channel === c} onChange={() => setChannel(c)} />
            {c === "email" ? m.email : m.text}
          </label>
        ))}
      </fieldset>

      <div role="status" aria-live="polite" className="visually-hidden">
        {state.kind === "loading" ? m.writing : state.kind === "ready" ? m.ready : ""}
      </div>

      {state.kind === "loading" && (
        <div className="skeleton" aria-hidden>
          {Array.from({ length: channel === "email" ? 9 : 4 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      )}

      {state.kind === "error" && (
        <div className="alert" role="alert">
          <h2>{m.errorTitle}</h2>
          <p style={{ margin: "0 0 12px" }}>{state.message}</p>
          <button type="button" className="btn btn--secondary" onClick={() => setAttempt((n) => n + 1)}>
            {m.tryAgain}
          </button>
        </div>
      )}

      {state.kind === "ready" && (
        <div className="reveal">
          <MessageDraft channel={channel} to={state.to} subject={state.subject} body={state.body} />
          <p className="source-tag">
            {state.source !== "template" && <Sparkle />}
            {m.source[state.source]}
          </p>
        </div>
      )}
    </Dialog>
  );
}
