// Minimal RFC 5545 calendar file. Hand-rolled: the format is tiny and well defined.

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

export function buildIcsString(clinicName: string, phone: string, reminderDateIso: string): string {
  const start = new Date(reminderDateIso);
  const end = new Date(start.getTime() + 15 * 60_000);
  const uid = `${start.getTime()}-${Math.random().toString(36).slice(2)}@access-care-navigator`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AccessCare Navigator//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeText(`Call ${clinicName} to book`)}`,
    `DESCRIPTION:${escapeText(`Call ${clinicName} at ${phone}. Have your advocacy script and insurance card ready.`)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(`Call ${clinicName}`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n")
    .concat("\r\n");
}

/** Next weekday at 10:00 local time — clinics are usually open then. */
export function nextBusinessMorning(from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}
