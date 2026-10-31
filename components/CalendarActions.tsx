"use client";

import { useState } from "react";
import type { CalEvent } from "@/lib/ics";
import { downloadIcs } from "@/lib/ics";
import { googleTemplateUrl } from "@/lib/google-calendar";
import { useCalendar } from "./CalendarProvider";
import { Calendar, Check, ExternalLink } from "./Icons";

interface Props {
  event: CalEvent;
  filename: string;
  /** e.g. "appointment" or "reminder" — used in button text */
  noun: string;
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
  const [state, setState] = useState<{ kind: "idle" | "adding" } | { kind: "added"; link: string } | { kind: "error"; msg: string }>({
    kind: "idle",
  });

  const canOneClick = configured;

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
            Added. Open in Google Calendar
            <ExternalLink />
            <span className="visually-hidden">(opens in a new tab)</span>
          </a>
        ) : canOneClick ? (
          <button type="button" className={btnClass} onClick={add} disabled={state.kind === "adding"}>
            <Calendar />
            {state.kind === "adding"
              ? "Adding…"
              : connection
                ? `Add ${noun} to Google Calendar`
                : `Connect Google & add ${noun}`}
          </button>
        ) : (
          <a className={btnClass} href={googleTemplateUrl(event)} target="_blank" rel="noopener noreferrer">
            <Calendar />
            Add {noun} to Google Calendar
            <ExternalLink />
            <span className="visually-hidden">(opens Google Calendar in a new tab)</span>
          </a>
        )}
        <button type="button" className="btn btn--secondary" onClick={() => downloadIcs(event, filename)}>
          Download .ics
        </button>
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">
        {state.kind === "added" ? `The ${noun} was added to your Google Calendar.` : ""}
      </p>
      {state.kind === "error" && (
        <p className="field__error" role="alert" style={{ marginTop: 10 }}>
          Couldn&rsquo;t add to Google Calendar: {state.msg}
        </p>
      )}
    </div>
  );
}
