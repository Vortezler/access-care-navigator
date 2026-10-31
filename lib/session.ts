import { ACCESSIBILITY_KEYS, type AccessibilityRequirements } from "./types";
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
  const intake = loadSession()?.intake;
  return intake ? { ...intake, accessibilityRequirements: loadReviewedNeeds() ?? intake.accessibilityRequirements } : null;
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

export function loadReviewedNeeds(): AccessibilityRequirements | null {
  try {
    const raw = sessionStorage.getItem("acn:reviewed-needs");
    if (!raw) return null;
    const value = JSON.parse(raw);
    return Object.fromEntries(ACCESSIBILITY_KEYS.map(k => [k, value?.[k] === true])) as unknown as AccessibilityRequirements;
  } catch { return null; }
}

export function saveReviewedNeeds(needs: AccessibilityRequirements) {
  try { sessionStorage.setItem("acn:reviewed-needs", JSON.stringify(needs)); } catch { /* tab storage unavailable */ }
  const session = loadSession();
  if (session) saveSession({ intake: { ...session.intake, accessibilityRequirements: needs }, results: [] });
}
