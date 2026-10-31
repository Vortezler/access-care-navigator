// Google Calendar, browser-only. No accounts and no server: Google Identity Services
// gives the page a short-lived access token, which we keep in this browser's localStorage.
// Without NEXT_PUBLIC_GOOGLE_CLIENT_ID we fall back to Google's "add event" link,
// which needs no setup at all.

import type { CalEvent } from "./ics";

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events", // add events
  "https://www.googleapis.com/auth/calendar.freebusy", // check slots against busy times
].join(" ");
const STORE_KEY = "acn:gcal";
const API = "https://www.googleapis.com/calendar/v3";

export interface GcalConnection {
  accessToken: string;
  expiresAt: number; // epoch ms
  email?: string;
  connectedAt: number;
}

// --- minimal typings for the bits of Google Identity Services we use ---
interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}
interface TokenClient {
  requestAccessToken(o?: { prompt?: string }): void;
}
interface Gis {
  accounts: {
    oauth2: {
      initTokenClient(c: {
        client_id: string;
        scope: string;
        callback: (r: TokenResponse) => void;
        error_callback?: (e: { type: string; message?: string }) => void;
      }): TokenClient;
      revoke(token: string, done?: () => void): void;
    };
  };
}
declare global {
  interface Window {
    google?: Gis;
  }
}

export function loadConnection(): GcalConnection | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as GcalConnection) : null;
  } catch {
    return null;
  }
}

export function saveConnection(c: GcalConnection | null) {
  try {
    if (c) localStorage.setItem(STORE_KEY, JSON.stringify(c));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    /* storage blocked: connection lasts for this visit only */
  }
}

export function tokenValid(c: GcalConnection | null): boolean {
  return Boolean(c && c.expiresAt - 60_000 > Date.now());
}

let gisPromise: Promise<Gis> | null = null;
export function loadGis(): Promise<Gis> {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  gisPromise ??= new Promise<Gis>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => (window.google ? resolve(window.google) : reject(new Error("Google sign-in failed to load.")));
    s.onerror = () => {
      gisPromise = null;
      reject(new Error("Couldn't reach Google. Check your connection and try again."));
    };
    document.head.appendChild(s);
  });
  return gisPromise;
}

/** Opens Google's consent popup (or reuses consent silently). Must start from a click. */
export async function requestToken(prompt: "" | "consent"): Promise<{ accessToken: string; expiresAt: number }> {
  if (!GOOGLE_CLIENT_ID) throw new Error("Google Calendar isn't configured for this site.");
  const gis = await loadGis();
  return new Promise((resolve, reject) => {
    const client = gis.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (r) => {
        if (r.error || !r.access_token) reject(new Error(r.error_description || r.error || "Google didn't grant access."));
        else resolve({ accessToken: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 });
      },
      error_callback: (e) =>
        reject(new Error(e.type === "popup_closed" ? "The Google window was closed before finishing." : e.message || e.type)),
    });
    client.requestAccessToken({ prompt });
  });
}

async function api<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || `Google Calendar error ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchEmail(token: string): Promise<string | undefined> {
  try {
    // The primary calendar's id is the account's email address.
    const cal = await api<{ id: string }>(token, "/calendars/primary");
    return cal.id;
  } catch {
    return undefined;
  }
}

export async function insertEvent(token: string, ev: CalEvent): Promise<{ htmlLink: string }> {
  return api(token, "/calendars/primary/events", {
    method: "POST",
    body: JSON.stringify({
      summary: ev.title,
      description: ev.description,
      location: ev.location,
      start: { dateTime: ev.start.toISOString() },
      end: { dateTime: ev.end.toISOString() },
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: ev.alarmMinutes ?? 10 }] },
    }),
  });
}

export async function busyTimes(token: string, timeMin: Date, timeMax: Date): Promise<{ start: number; end: number }[]> {
  const r = await api<{ calendars: Record<string, { busy?: { start: string; end: string }[] }> }>(token, "/freeBusy", {
    method: "POST",
    body: JSON.stringify({ timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(), items: [{ id: "primary" }] }),
  });
  return (r.calendars.primary?.busy ?? []).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
}

export function revoke(token: string) {
  window.google?.accounts.oauth2.revoke(token);
}

/** No-setup fallback: Google Calendar's "create event" page, pre-filled. */
export function googleTemplateUrl(ev: CalEvent): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${fmt(ev.start)}/${fmt(ev.end)}`,
    details: ev.description,
    ...(ev.location ? { location: ev.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
