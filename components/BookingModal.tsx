"use client";

import { useEffect, useState } from "react";
import type { Clinic, IntakeData, Specialty } from "@/lib/types";
import { ACCESSIBILITY_KEYS } from "@/lib/types";
import { APPOINTMENT_MIN, appointmentEvent, confirmationNumber } from "@/lib/booking";
import Dialog from "./Dialog";
import CalendarActions from "./CalendarActions";
import { useCalendar } from "./CalendarProvider";
import { useI18n } from "./I18nProvider";
import { Alert } from "./Icons";

interface Props {
  clinic: Clinic | null;
  intake: IntakeData;
  open: boolean;
  onClose: () => void;
}

export default function BookingModal({ clinic, intake, open, onClose }: Props) {
  const { getBusy, connection } = useCalendar();
  const { t, formatSlot } = useI18n();
  const bk = t.booking;
  const [slot, setSlot] = useState<string>("");
  const [confirmed, setConfirmed] = useState<{ number: string; slot: string } | null>(null);
  const [clashes, setClashes] = useState<Set<string> | null>(null);
  const [checking, setChecking] = useState(false);
  const urgencyWindowDays = intake.urgencyWindowDays;

  useEffect(() => {
    if (!open) return;
    setSlot("");
    setConfirmed(null);
    setClashes(null);
    setChecking(false);
    if (!clinic || !connection) return;
    // Flag openings that overlap something already on the user's calendar.
    const slots = clinic.openSlots.map((s) => Date.parse(s));
    let cancelled = false;
    setChecking(true);
    getBusy(new Date(Math.min(...slots)), new Date(Math.max(...slots) + APPOINTMENT_MIN * 60_000)).then((busy) => {
      if (cancelled) return;
      setChecking(false);
      if (!busy) return;
      setClashes(
        new Set(
          clinic.openSlots.filter((s) => {
            const a = Date.parse(s);
            const b = a + APPOINTMENT_MIN * 60_000;
            return busy.some((r) => r.start < b && r.end > a);
          }),
        ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [open, clinic, connection, getBusy]);

  if (!clinic) return <Dialog open={false} onClose={onClose} title="">{null}</Dialog>;

  const windowEnd = Date.now() + urgencyWindowDays * 86_400_000;
  const upcoming = clinic.openSlots.filter((s) => Date.parse(s) > Date.now());

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={confirmed ? bk.booked : bk.title(clinic.name)}
      subtitle={confirmed ? undefined : bk.subtitle}
    >
      {confirmed ? (
        <div className="success" role="status">
          <div className="success__icon" aria-hidden>
            <svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="m8 16.5 5.5 5.5L24 11" />
            </svg>
          </div>
          <p style={{ margin: 0, fontSize: "1.0625rem" }}>
            <strong>{formatSlot(confirmed.slot)}</strong>
            <br />
            <span className="muted">{clinic.name}</span>
          </p>
          <p className="conf" aria-label={bk.confAria(confirmed.number)}>
            {confirmed.number}
          </p>
          <p className="muted" style={{ fontSize: "0.875rem", margin: "6px 0 18px" }}>
            {bk.demoDone}
          </p>
          <CalendarActions
            event={appointmentEvent(
              {
                clinic,
                slot: confirmed.slot,
                confirmation: confirmed.number,
                specialtyLabel: t.specialties[intake.specialty as Specialty] ?? intake.specialty,
                reason: intake.reasonForVisit,
                needLabels: ACCESSIBILITY_KEYS.filter((k) => intake.accessibilityRequirements[k]).map((k) => t.access.labels[k]),
              },
              t.events,
            )}
            filename={`appointment-${clinic.id}.ics`}
            noun="appointment"
            align="center"
          />
          <div className="dialog__footer">
            <button type="button" className="btn btn--primary" onClick={onClose}>
              {bk.done}
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (slot) setConfirmed({ number: confirmationNumber(), slot });
          }}
        >
          <p className="demo-note">
            <Alert size={16} />
            <span>{bk.demoNote}</span>
          </p>
          <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <legend className="visually-hidden">{bk.available}</legend>
            <div className="choices">
              {upcoming.map((s) => {
                const inWindow = Date.parse(s) <= windowEnd;
                const clash = clashes?.has(s);
                return (
                  <label className="choice choice--radio" key={s}>
                    <input type="radio" name="slot" value={s} checked={slot === s} onChange={() => setSlot(s)} />
                    <span className="choice__indicator" aria-hidden>
                      <span className="choice__dot" />
                    </span>
                    <span className="choice__text">
                      <span className="choice__title">{formatSlot(s)}</span>
                      <span className="choice__desc">
                        {inWindow ? bk.within(urgencyWindowDays) : bk.later(urgencyWindowDays)}
                      </span>
                      {clash !== undefined && (
                        <span className={`choice__desc${clash ? " choice__desc--warn" : ""}`}>
                          {clash ? bk.clash : bk.free}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {checking && (
            <p className="inline-note">{bk.checking}</p>
          )}
          <div className="dialog__footer">
            <button type="submit" className="btn btn--primary" disabled={!slot} aria-disabled={!slot}>
              {bk.confirm}
            </button>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              {bk.cancel}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
