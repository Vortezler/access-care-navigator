// Minimal RFC 5545 calendar file. Hand-rolled: the format is tiny and well defined.

import en, { type Dict } from "./i18n/en";

export interface CalEvent {
  title: string;
  description: string;
  location?: string;
  start: Date;
  end: Date;
  alarmMinutes?: number;
}

function toIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545 §3.1: lines longer than 75 chars are folded with CRLF + a single space. */
function fold(line: string): string {
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += i === 0 ? 75 : 74) parts.push(line.slice(i, i + (i === 0 ? 75 : 74)));
  return parts.join("\r\n ");
}

export function buildEventIcs(ev: CalEvent): string {
  const uid = `${ev.start.getTime()}-${Math.random().toString(36).slice(2)}@access-care-navigator`;
  const alarm = ev.alarmMinutes ?? 10;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AccessCare Navigator//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(ev.start)}`,
    `DTEND:${toIcsDate(ev.end)}`,
    `SUMMARY:${escapeText(ev.title)}`,
    `DESCRIPTION:${escapeText(ev.description)}`,
    ...(ev.location ? [`LOCATION:${escapeText(ev.location)}`] : []),
    "BEGIN:VALARM",
    `TRIGGER:-PT${alarm}M`,
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(ev.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n")
    .concat("\r\n");
}

/** The call reminder used by the Advocacy Script flow. */
export function callReminderEvent(
  clinicName: string,
  phone: string,
  reminderDateIso: string,
  text: Dict["events"] = en.events,
): CalEvent {
  const start = new Date(reminderDateIso);
  return {
    title: text.callTitle(clinicName),
    description: text.callDesc(clinicName, phone),
    start,
    end: new Date(start.getTime() + 15 * 60_000),
  };
}

export function buildIcsString(clinicName: string, phone: string, reminderDateIso: string): string {
  return buildEventIcs(callReminderEvent(clinicName, phone, reminderDateIso));
}

export function downloadIcs(ev: CalEvent, filename: string) {
  const url = URL.createObjectURL(new Blob([buildEventIcs(ev)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Next weekday at 10:00 local time — clinics are usually open then. */
export function nextBusinessMorning(from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}
