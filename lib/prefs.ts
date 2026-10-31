// Display & reading preferences. No accounts, so they live in this browser's localStorage.

export type Theme = "night" | "day" | "contrast";
export type TextSize = "md" | "lg" | "xl" | "xxl";

export interface Prefs {
  theme: Theme;
  textSize: TextSize;
  reduceMotion: boolean;
  readableFont: boolean;
  speechRate: number;
  voiceURI: string;
}

export const DEFAULT_PREFS: Prefs = {
  theme: "night",
  textSize: "md",
  reduceMotion: false,
  readableFont: false,
  speechRate: 1,
  voiceURI: "",
};

export const PREFS_KEY = "acn:prefs";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap";

export function loadPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...(JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as Partial<Prefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* storage blocked: prefs still apply for this visit */
  }
}

function setAttr(name: string, value: string | null) {
  const r = document.documentElement;
  if (value === null) r.removeAttribute(name);
  else r.setAttribute(name, value);
}

export function applyPrefs(p: Prefs) {
  setAttr("data-theme", p.theme === "night" ? null : p.theme);
  setAttr("data-text", p.textSize === "md" ? null : p.textSize);
  setAttr("data-motion", p.reduceMotion ? "reduce" : null);
  setAttr("data-font", p.readableFont ? "readable" : null);
  if (p.readableFont && !document.getElementById("acn-font")) {
    const l = document.createElement("link");
    l.id = "acn-font";
    l.rel = "stylesheet";
    l.href = FONT_HREF;
    document.head.appendChild(l);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", p.theme === "day" ? "#f7f2ea" : p.theme === "contrast" ? "#000000" : "#0d0b12");
}

/** Inlined in <head> so saved preferences apply before first paint (no flash of the wrong theme). */
export const PREFS_BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(PREFS_KEY)})||"{}");var r=document.documentElement;if(p.theme&&p.theme!=="night")r.setAttribute("data-theme",p.theme);if(p.textSize&&p.textSize!=="md")r.setAttribute("data-text",p.textSize);if(p.reduceMotion)r.setAttribute("data-motion","reduce");if(p.readableFont){r.setAttribute("data-font","readable");var l=document.createElement("link");l.id="acn-font";l.rel="stylesheet";l.href=${JSON.stringify(FONT_HREF)};document.head.appendChild(l);}}catch(e){}})();`;
