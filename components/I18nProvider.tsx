"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Dict, Lang } from "@/lib/i18n";
import { LANG_KEY, detectLang, getDict, speechLocale } from "@/lib/i18n";

interface I18nValue {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
  /** BCP-47 locale for speech recognition and synthesis, e.g. "es-US" */
  speech: string;
  /** "Tuesday, November 3 at 11:00 AM" in the current language */
  formatSlot: (iso: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export const useT = () => useI18n().t;

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(detectLang());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* storage blocked: applies for this visit */
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const locale = speechLocale(lang);
    const fmt = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return { lang, t: getDict(lang), setLang, speech: locale, formatSlot: (iso) => fmt.format(new Date(iso)) };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
