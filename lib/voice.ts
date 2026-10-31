// Voice typing via the browser's built-in speech recognition (Chrome, Edge, Safari).
// Audio is handled by the browser; nothing is sent to this app's server.

import type { Specialty } from "./types";
import { SPECIALTIES } from "./types";

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
export interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

export function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Only one microphone session at a time across the page.
let active: Recognition | null = null;
export function claim(r: Recognition) {
  if (active && active !== r) active.abort();
  active = r;
}
export function release(r: Recognition) {
  if (active === r) active = null;
}

/** Speech-recognition error code -> key into the dictionary's voice.errors */
export function errorKey(code: string): "blocked" | "noSpeech" | "noMic" | "network" | "generic" {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "blocked";
    case "no-speech":
      return "noSpeech";
    case "audio-capture":
      return "noMic";
    case "network":
      return "network";
    default:
      return "generic";
  }
}

// ---------- Turning speech into field values ----------

// Number words recognisers sometimes return instead of digits (most return digits in every language).
const SMALL: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, ninety: 90, couple: 2, few: 3,
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, une: 1, deux: 2, trois: 3, quatre: 4,
  một: 1, hai: 2, ba: 3, bốn: 4, năm: 5, एक: 1, दो: 2, तीन: 3, चार: 4, पाँच: 5,
  一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
};

/** "14", "fourteen", "two weeks", "a month", "twenty one days" -> number of days. */
export function parseDays(spoken: string): number | null {
  const t = spoken.toLowerCase().replace(/-/g, " ");
  let n: number | null = null;
  const digits = t.match(/\d+/);
  if (digits) n = Number(digits[0]);
  else {
    // Chinese has no spaces between words, so look at each character there
    const words = /[一-鿿]/.test(t) ? [...t] : t.split(/\s+/);
    let total = 0;
    let found = false;
    for (const w of words) {
      if (w in SMALL) {
        total += SMALL[w];
        found = true;
      }
    }
    if (found) n = total;
  }
  if (n === null) return null;
  if (/week|semana|semaine|tuần|周|星期|हफ़्त|हफ्त|सप्ताह/.test(t)) n *= 7;
  else if (/month|mes|mois|tháng|月|महीन/.test(t)) n *= 30;
  return n;
}

/** Spoken IDs come back as "a e t 4417 2290" or "AET dash 4417". */
export function normalizeId(spoken: string): string {
  return spoken
    .replace(/\b(dash|hyphen)\b/gi, "-")
    .replace(/\b([a-z])\b\s*/gi, "$1") // join spelled-out letters
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, "")
    .toUpperCase();
}

/**
 * Match a spoken specialty name (people say it many ways) to one of our options.
 * `localized` is the current language's display names, checked first.
 */
export function matchSpecialty(spoken: string, localized?: Record<Specialty, string>): Specialty | null {
  const t = spoken.toLowerCase();
  if (localized) {
    const norm = (x: string) => x.toLowerCase().replace(/\(.*?\)|（.*?）/g, "").trim();
    const hit = SPECIALTIES.find((s) => {
      const name = norm(localized[s]);
      return name.length > 1 && (t.includes(name) || (t.trim().length >= 3 && name.includes(t.trim())));
    });
    if (hit) return hit;
  }
  const table: [RegExp, Specialty][] = [
    [/primary|general|family|\bgp\b|regular doctor/, "Primary Care"],
    [/\bob\b|\bo b\b|gyn|obstet|women/, "OB/GYN"],
    [/pediat|paediat|\bchild|\bkids?\b/, "Pediatrics"],
    [/\be\s?n\s?t\b|\bears?\b|\bnose\b|\bthroat\b/, "ENT"],
    [/physical|physio|rehab/, "Physical Therapy"],
    [/neuro/, "Neurology"],
    [/cardi|heart/, "Cardiology"],
    [/derma|\bskin\b/, "Dermatology"],
    [/ortho|\bbones?\b|\bjoints?\b/, "Orthopedics"],
    [/psych|mental/, "Psychiatry"],
  ];
  for (const [re, s] of table) if (re.test(t)) return s;
  return SPECIALTIES.find((s) => t.includes(s.toLowerCase())) ?? null;
}
