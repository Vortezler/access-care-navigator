"use client";

import { useEffect, useId, useState } from "react";
import type { Channel } from "@/lib/ai-client";
import { useA11y } from "./A11yProvider";
import { useT } from "./I18nProvider";
import { Copy, ExternalLink, Speaker } from "./Icons";

interface Props {
  channel: Channel;
  to: string; // email address or phone number
  subject: string;
  body: string;
}

const enc = encodeURIComponent;

/** US numbers like "(503) 555-0142" -> "+15035550142" for sms: links */
function telDigits(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `+1${d}` : `+${d}`;
}

/**
 * An editable draft plus "open in my own app" links. Nothing is sent from this site:
 * mailto:/sms: hand the text to the person's email or messaging app, where they press send.
 */
export default function MessageDraft({ channel, to, subject: initialSubject, body: initialBody }: Props) {
  const t = useT();
  const m = t.msg;
  const { speechSupported, readText, readState, stop } = useA11y();
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [copied, setCopied] = useState(false);
  const id = useId();

  // A new draft (other channel/language) replaces edits to the old one
  useEffect(() => {
    setSubject(initialSubject);
    setBody(initialBody);
  }, [initialSubject, initialBody]);

  const href =
    channel === "email"
      ? `mailto:${to}?subject=${enc(subject)}&body=${enc(body)}`
      : `sms:${telDigits(to)}?&body=${enc(body)}`; // "?&body" works on both iOS and Android

  async function copy() {
    try {
      await navigator.clipboard.writeText(channel === "email" && subject ? `${subject}\n\n${body}` : body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      /* clipboard blocked: the text is still selectable */
    }
  }

  return (
    <div className="draft">
      <p className="draft__to">{m.to(to)}</p>
      {channel === "email" && (
        <div className="field">
          <label className="field__label" htmlFor={`${id}-subject`}>
            {m.subject}
          </label>
          <input id={`${id}-subject`} className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
      )}
      <div className="field">
        <label className="field__label" htmlFor={`${id}-body`}>
          {m.body}
        </label>
        <textarea
          id={`${id}-body`}
          className="script draft__body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={channel === "email" ? 12 : 5}
        />
        {channel === "sms" && <span className="field__help">{body.length} / 320</span>}
      </div>
      <div className="cal-actions" style={{ justifyContent: "flex-start", marginTop: 0 }}>
        <a className="btn btn--primary" href={href}>
          {channel === "email" ? m.openEmail : m.openText}
          <ExternalLink />
        </a>
        <button type="button" className="btn btn--secondary" onClick={copy}>
          <Copy />
          {copied ? m.copied : m.copy}
        </button>
        {speechSupported && (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => (readState === "idle" ? readText(body, m.listen) : stop())}
          >
            <Speaker />
            {readState === "idle" ? m.listen : t.script.stopListen}
          </button>
        )}
      </div>
      <p className="visually-hidden" role="status">
        {copied ? m.copiedStatus : ""}
      </p>
      <p className="inline-note">
        {m.note} {m.demoNote}
      </p>
    </div>
  );
}
