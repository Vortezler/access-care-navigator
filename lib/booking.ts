// Simulated booking, shared by the booking dialog and the Care Guide's book_appointment tool.

import type { Clinic } from "./types";
import type { CalEvent } from "./ics";
import en, { type Dict } from "./i18n/en";

export const APPOINTMENT_MIN = 60;

export function confirmationNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alikes (0/O, 1/I)
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `CONF-${out}`;
}

export interface AppointmentDetails {
  clinic: Clinic;
  slot: string; // ISO
  confirmation: string;
  specialtyLabel: string;
  reason?: string;
  needLabels: string[];
}

export function appointmentEvent(a: AppointmentDetails, text: Dict["events"] = en.events): CalEvent {
  const start = new Date(a.slot);
  return {
    title: text.apptTitle(a.specialtyLabel, a.clinic.name),
    description: [
      text.confirmation(a.confirmation),
      text.phone(a.clinic.phone),
      a.reason ? text.reason(a.reason) : "",
      a.needLabels.length ? text.accommodations(a.needLabels.join("; ")) : "",
    ]
      .filter(Boolean)
      .join("\n"),
    location: a.clinic.address,
    start,
    end: new Date(start.getTime() + APPOINTMENT_MIN * 60_000),
    alarmMinutes: 60,
  };
}
