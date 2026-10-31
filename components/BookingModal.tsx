"use client";

import { useEffect, useState } from "react";
import type { Clinic } from "@/lib/types";
import { formatSlot } from "@/lib/session";
import Dialog from "./Dialog";
import { Alert } from "./Icons";

interface Props {
  clinic: Clinic | null;
  open: boolean;
  onClose: () => void;
  urgencyWindowDays: number;
}

function confirmationNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alikes (0/O, 1/I)
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `CONF-${out}`;
}

export default function BookingModal({ clinic, open, onClose, urgencyWindowDays }: Props) {
  const [slot, setSlot] = useState<string>("");
  const [confirmed, setConfirmed] = useState<{ number: string; slot: string } | null>(null);

  useEffect(() => {
    if (open) {
      setSlot("");
      setConfirmed(null);
    }
  }, [open, clinic?.id]);

  if (!clinic) return <Dialog open={false} onClose={onClose} title="">{null}</Dialog>;

  const windowEnd = Date.now() + urgencyWindowDays * 86_400_000;
  const upcoming = clinic.openSlots.filter((s) => Date.parse(s) > Date.now());

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={confirmed ? "You’re booked" : `Book at ${clinic.name}`}
      subtitle={confirmed ? undefined : "Pick an opening. We’ll pass your accessibility needs along with the booking."}
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
          <p className="conf" aria-label={`Confirmation number ${confirmed.number.split("").join(" ")}`}>
            {confirmed.number}
          </p>
          <p className="muted" style={{ fontSize: "0.875rem", margin: "6px 0 0" }}>
            Demo booking — no real appointment was made.
          </p>
          <div className="dialog__footer">
            <button type="button" className="btn btn--primary" onClick={onClose}>
              Done
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
            <span>Demo booking — no real appointment is made and no clinic is contacted.</span>
          </p>
          <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <legend className="visually-hidden">Available appointments</legend>
            <div className="choices">
              {upcoming.map((s) => {
                const inWindow = Date.parse(s) <= windowEnd;
                return (
                  <label className="choice choice--radio" key={s}>
                    <input type="radio" name="slot" value={s} checked={slot === s} onChange={() => setSlot(s)} />
                    <span className="choice__indicator" aria-hidden>
                      <span className="choice__dot" />
                    </span>
                    <span className="choice__text">
                      <span className="choice__title">{formatSlot(s)}</span>
                      <span className="choice__desc">
                        {inWindow ? `Within your ${urgencyWindowDays}-day window` : `Later than your ${urgencyWindowDays}-day window`}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="dialog__footer">
            <button type="submit" className="btn btn--primary" disabled={!slot} aria-disabled={!slot}>
              Confirm booking
            </button>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
