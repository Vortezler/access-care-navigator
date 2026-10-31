"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { CalEvent } from "@/lib/ics";
import type { GcalConnection } from "@/lib/google-calendar";
import {
  GOOGLE_CLIENT_ID,
  busyTimes,
  fetchEmail,
  insertEvent,
  loadConnection,
  requestToken,
  revoke,
  saveConnection,
  tokenValid,
} from "@/lib/google-calendar";

interface CalendarContextValue {
  /** True when a Google OAuth client ID is set, so one-click adding is possible. */
  configured: boolean;
  connection: GcalConnection | null;
  busy: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  addEvent: (ev: CalEvent) => Promise<string>;
  /** Busy ranges from the user's calendar, or null if we can't check without a popup. */
  getBusy: (from: Date, to: Date) => Promise<{ start: number; end: number }[] | null>;
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error("useCalendar must be used inside <CalendarProvider>");
  return ctx;
}

export default function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [connection, setConnection] = useState<GcalConnection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConnection(loadConnection());
  }, []);

  const store = (c: GcalConnection | null) => {
    saveConnection(c);
    setConnection(c);
  };

  const connect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const t = await requestToken("consent");
      const email = await fetchEmail(t.accessToken);
      store({ ...t, email, connectedAt: Date.now() });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    const c = loadConnection();
    if (c && tokenValid(c)) revoke(c.accessToken);
    store(null);
    setError(null);
  }, []);

  /** A valid token, refreshing through Google's popup if needed (call from a click). */
  const ensureToken = useCallback(async (): Promise<string> => {
    const c = loadConnection();
    if (c && tokenValid(c)) return c.accessToken;
    const t = await requestToken(c ? "" : "consent");
    const email = c?.email ?? (await fetchEmail(t.accessToken));
    store({ ...t, email, connectedAt: c?.connectedAt ?? Date.now() });
    return t.accessToken;
  }, []);

  const addEvent = useCallback(
    async (ev: CalEvent) => {
      const token = await ensureToken();
      const r = await insertEvent(token, ev);
      return r.htmlLink;
    },
    [ensureToken],
  );

  const getBusy = useCallback(async (from: Date, to: Date) => {
    const c = loadConnection();
    if (!c || !tokenValid(c)) return null; // never pop a window just to check conflicts
    try {
      return await busyTimes(c.accessToken, from, to);
    } catch {
      return null;
    }
  }, []);

  return (
    <CalendarContext.Provider
      value={{ configured: Boolean(GOOGLE_CLIENT_ID), connection, busy, error, connect, disconnect, addEvent, getBusy }}
    >
      {children}
    </CalendarContext.Provider>
  );
}
