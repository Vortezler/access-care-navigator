import type { IntakeData, MatchResult } from "./types";

// sessionStorage is the hand-off between the intake page and /results. Nothing is saved server-side.
const KEY = "acn:session";

export interface StoredSession {
  intake: IntakeData;
  results: MatchResult[];
}

export function saveSession(s: StoredSession) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode / quota — results page will show its empty state */
  }
}

export function loadSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function loadIntakeDraft(): IntakeData | null {
  return loadSession()?.intake ?? null;
}

const slotFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatSlot(iso: string): string {
  return slotFormatter.format(new Date(iso));
}
