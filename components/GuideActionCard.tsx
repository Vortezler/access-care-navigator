"use client";

import { useState } from "react";
import type { ChatAction } from "@/lib/care-guide";
import { appointmentEvent } from "@/lib/booking";
import { callReminderEvent, nextBusinessMorning } from "@/lib/ics";
import { getClinicById } from "@/lib/clinics";
import CalendarActions from "./CalendarActions";
import { useA11y } from "./A11yProvider";
import { useI18n } from "./I18nProvider";
import MessageDraft from "./MessageDraft";
import { Calendar, Chat, Check, Copy, Phone, Speaker } from "./Icons";

/** Renders what a Care Guide tool did: clinics found, a booking, a call script, a calendar event. */
export default function GuideActionCard({ action }: { action: ChatAction }) {
  const { t, formatSlot } = useI18n();
  const { speechSupported, readText, readState, stop } = useA11y();
  const [copied, setCopied] = useState(false);
  const g = t.guide;

  if (action.type === "accessibility") return null;

  if (action.type === "clinics") {
    return (
      <section className="action-card" aria-label={g.clinicsFound(action.clinics.length)}>
        <h3 className="action-card__title">{g.clinicsFound(action.clinics.length)}</h3>
        <ol className="mini-clinics">
          {action.clinics.map((c) => (
            <li key={c.id}>
              <span className="mini-clinics__name">{c.name}</span>
              <span className="badges">
                <span className="badge">{c.score}/100</span>
                {c.needsTotal > 0 && <span className="badge">{g.needsMet(c.needsMet, c.needsTotal)}</span>}
                <span className={`badge ${c.inNetwork ? "badge--ok" : "badge--warn"}`}>
                  {c.inNetwork ? t.card.inNetwork : t.card.outNetwork}
                </span>
                <span className={`badge ${c.online ? "badge--accent" : ""}`}>{c.online ? t.card.online : t.card.phoneOnly}</span>
              </span>
              <span className="mini-clinics__meta">
                {c.address} · <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>{c.phone}</a>
              </span>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  if (action.type === "booking") {
    const clinic = getClinicById(action.clinicId);
    if (!clinic) return null;
    const event = appointmentEvent(
      {
        clinic,
        slot: action.slot,
        confirmation: action.confirmation,
        specialtyLabel: t.specialties[action.specialty] ?? action.specialty,
        reason: action.reason,
        needLabels: action.needs.map((k) => t.access.labels[k]),
      },
      t.events,
    );
    return (
      <section className="action-card action-card--ok" aria-label={g.booked}>
        <h3 className="action-card__title">
          <Check size={14} /> {g.booked}
        </h3>
        <p className="action-card__lead">
          <strong>{formatSlot(action.slot)}</strong>
          <br />
          {clinic.name}
        </p>
        <p className="conf" aria-label={t.booking.confAria(action.confirmation)}>
          {action.confirmation}
        </p>
        <CalendarActions event={event} filename={`appointment-${clinic.id}.ics`} noun="appointment" />
      </section>
    );
  }

  if (action.type === "calendar") {
    const ev = action.event;
    return (
      <section className="action-card" aria-label={g.calendarCard}>
        <h3 className="action-card__title">
          <Calendar size={16} /> {g.calendarCard}
        </h3>
        <p className="action-card__lead">
          <strong>{ev.title}</strong>
          <br />
          {formatSlot(ev.start)}
          {ev.location ? ` · ${ev.location}` : ""}
        </p>
        <CalendarActions
          event={{ title: ev.title, description: ev.description, location: ev.location, start: new Date(ev.start), end: new Date(ev.end) }}
          filename="event.ics"
          noun="event"
        />
      </section>
    );
  }

  if (action.type === "selfcare") {
    return (
      <section className="action-card selfcare" aria-label={g.selfCareTitle}>
        <h3 className="action-card__title">{g.selfCareTitle}</h3>
        <ul>
          {action.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <div className="selfcare__warn">
          <h4>{g.warningTitle}</h4>
          <ul>
            {action.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
        <p className="inline-note" style={{ margin: 0 }}>
          {g.selfCareNote}
        </p>
      </section>
    );
  }

  if (action.type === "message") {
    const target = getClinicById(action.clinicId);
    if (!target) return null;
    return (
      <section className="action-card" aria-label={g.draftTitle(target.name)}>
        <h3 className="action-card__title">
          <Chat size={16} /> {g.draftTitle(target.name)}
        </h3>
        <MessageDraft
          channel={action.channel}
          to={action.channel === "email" ? target.email : target.phone}
          subject={action.subject}
          body={action.body}
        />
      </section>
    );
  }

  // call script
  const clinic = getClinicById(action.clinicId);
  if (!clinic) return null;
  const reminder = nextBusinessMorning();
  return (
    <section className="action-card" aria-label={g.scriptCard(clinic.name)}>
      <h3 className="action-card__title">
        <Phone size={16} /> {g.scriptCard(clinic.name)}
      </h3>
      <p className="action-card__lead">
        <a href={`tel:${clinic.phone.replace(/[^\d+]/g, "")}`}>{clinic.phone}</a>
      </p>
      <div className="script script--static" tabIndex={0} role="document" aria-label={t.script.label}>
        {action.script}
      </div>
      <div className="cal-actions" style={{ justifyContent: "flex-start" }}>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(action.script);
              setCopied(true);
              setTimeout(() => setCopied(false), 2400);
            } catch {
              /* clipboard blocked: the text is still selectable */
            }
          }}
        >
          <Copy />
          {copied ? t.script.copied : t.script.copy}
        </button>
        {speechSupported && (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => (readState === "idle" ? readText(action.script, t.script.readingLabel) : stop())}
          >
            <Speaker />
            {readState === "idle" ? t.script.listen : t.script.stopListen}
          </button>
        )}
      </div>
      <p className="visually-hidden" role="status">
        {copied ? t.script.copiedStatus : ""}
      </p>
      <h4 className="clinic__subhead" style={{ margin: "16px 0 8px" }}>
        {t.script.remind}
      </h4>
      <CalendarActions
        event={callReminderEvent(clinic.name, clinic.phone, reminder.toISOString(), t.events)}
        filename={`call-${clinic.id}.ics`}
        noun="reminder"
      />
    </section>
  );
}
