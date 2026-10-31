import en, { type Dict } from "./en";
import es from "./es";
import zh from "./zh";
import vi from "./vi";
import fr from "./fr";
import hi from "./hi";

export type { Dict };

export const LANGS = [
  { code: "en", label: "English", speech: "en-US" },
  { code: "es", label: "Español", speech: "es-US" },
  { code: "zh", label: "中文（简体）", speech: "zh-CN" },
  { code: "vi", label: "Tiếng Việt", speech: "vi-VN" },
  { code: "fr", label: "Français", speech: "fr-FR" },
  { code: "hi", label: "हिन्दी", speech: "hi-IN" },
] as const;

export type Lang = (typeof LANGS)[number]["code"];

const DICTS: Record<Lang, Dict> = { en, es, zh, vi, fr, hi };

export const LANG_KEY = "acn:lang";

export function isLang(x: unknown): x is Lang {
  return typeof x === "string" && LANGS.some((l) => l.code === x);
}

export function getDict(lang: unknown): Dict {
  return isLang(lang) ? DICTS[lang] : en;
}

export function speechLocale(lang: Lang): string {
  return LANGS.find((l) => l.code === lang)?.speech ?? "en-US";
}

/** Saved choice first, then the browser's preferred languages, then English. */
export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (isLang(saved)) return saved;
  } catch {
    /* storage blocked */
  }
  for (const l of navigator.languages ?? [navigator.language]) {
    const base = l.toLowerCase().split("-")[0];
    if (isLang(base)) return base;
  }
  return "en";
}

/** Inlined in <head>: set <html lang> before paint so screen readers and fonts get it right. */
export const LANG_BOOT_SCRIPT = `(function(){try{var c=${JSON.stringify(LANGS.map((l) => l.code))};var s=localStorage.getItem(${JSON.stringify(LANG_KEY)});var l=c.indexOf(s)>=0?s:null;if(!l){var n=navigator.languages||[navigator.language];for(var i=0;i<n.length&&!l;i++){var b=String(n[i]).toLowerCase().split("-")[0];if(c.indexOf(b)>=0)l=b;}}if(l)document.documentElement.lang=l;}catch(e){}})();`;
