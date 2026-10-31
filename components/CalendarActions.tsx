"use client";

import { useState } from "react";
import type { CalEvent } from "@/lib/ics";
import { downloadIcs } from "@/lib/ics";
import { googleTemplateUrl } from "@/lib/google-calendar";
import { useCalendar } from "./CalendarProvider";
import { useT } from "./I18nProvider";
import { Calendar, Check, ExternalLink } from "./Icons";

interface Props {
  event: CalEvent;
  filename: string;
  /** What's being added — used in button text */
  noun: "appointment" | "reminder" | "event";
  primary?: boolean;
  align?: "start" | "center";
}

/**
 * One place for every "put this on my calendar" option:
 * - Google Calendar, one click when connected (or configured: connects first),
 * - otherwise Google's pre-filled event page in a new tab (no setup needed),
 * - and a plain .ics file for Apple Calendar, Outlook, etc.
 */
export default function CalendarActions({ event, filename, noun, primary = false, align = "start" }: Props) {
  const { configured, connection, addEvent } = useCalendar();
  const t = useT();
  const c = t.cal;
  const word = c.nouns[noun];
  const [state, setState] = useState<{ kind: "idle" | "adding" } | { kind: "added"; link: string } | { kind: "error"; msg: string }>({
    kind: "idle",
  });

  async function add() {
    setState({ kind: "adding" });
    try {
      const link = await addEvent(event);
      setState({ kind: "added", link });
    } catch (e) {
      setState({ kind: "error", msg: (e as Error).message });
    }
  }

  const btnClass = `btn ${primary ? "btn--primary" : "btn--secondary"}`;

  return (
    <div>
      <div className="cal-actions" style={{ justifyContent: align === "center" ? "center" : "flex-start", marginTop: 0 }}>
        {state.kind === "added" ? (
          <a className="btn btn--secondary" href={state.link} target="_blank" rel="noopener noreferrer">
            <Check size={14} />
            {c.added}
            <ExternalLink />
            <span className="visually-hidden">{t.common.newTab}</span>
          </a>
        ) : configured ? (
          <button type="button" className={btnClass} onClick={add} disabled={state.kind === "adding"}>
            <Calendar />
            {state.kind === "adding" ? c.adding : connection ? c.add(word) : c.connectAdd(word)}
          </button>
        ) : (
          <a className={btnClass} href={googleTemplateUrl(event)} target="_blank" rel="noopener noreferrer">
            <Calendar />
            {c.add(word)}
            <ExternalLink />
            <span className="visually-hidden">{t.common.newTab}</span>
          </a>
        )}
        <button type="button" className="btn btn--secondary" onClick={() => downloadIcs(event, filename)}>
          {c.download}
        </button>
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">
        {state.kind === "added" ? c.addedStatus(word) : ""}
      </p>
      {state.kind === "error" && (
        <p className="field__error" role="alert" style={{ marginTop: 10 }}>
          {c.error(state.msg)}
        </p>
      )}
    </div>
  );
}
