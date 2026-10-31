"use client";

import type { TextSize, Theme } from "@/lib/prefs";
import { LANGS } from "@/lib/i18n";
import { useA11y } from "./A11yProvider";
import { useCalendar } from "./CalendarProvider";
import { useI18n } from "./I18nProvider";
import Dialog from "./Dialog";
import { Speaker } from "./Icons";

interface Props {
  open: boolean;
  onClose: () => void;
}

const THEMES: Theme[] = ["night", "day", "contrast"];
const SIZES: { value: TextSize; label: string }[] = [
  { value: "md", label: "A" },
  { value: "lg", label: "A+" },
  { value: "xl", label: "A++" },
  { value: "xxl", label: "A+++" },
];
const RATES = [0.75, 1, 1.25] as const;

export default function AccessibilityPanel({ open, onClose }: Props) {
  const { prefs, setPrefs, resetPrefs, speechSupported, voices, readPage } = useA11y();
  const { t, lang, setLang } = useI18n();
  const cal = useCalendar();
  const p = t.panel;

  const themeText: Record<Theme, [string, string]> = {
    night: [p.night, p.nightDesc],
    day: [p.day, p.dayDesc],
    contrast: [p.contrast, p.contrastDesc],
  };
  const rateText = [p.slow, p.normal, p.fast];

  const check = (
    <span className="choice__indicator" aria-hidden>
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path className="choice__check" d="m3.5 8.4 2.9 2.8 6.1-6.4" />
      </svg>
    </span>
  );

  return (
    <Dialog open={open} onClose={onClose} title={p.title} subtitle={p.subtitle}>
      <section className="settings-section" aria-labelledby="set-lang">
        <h3 id="set-lang">{p.language}</h3>
        <p>{p.languageBody}</p>
        <fieldset className="segmented">
          <legend className="visually-hidden">{p.language}</legend>
          {LANGS.map((l) => (
            <label className="segmented__opt" key={l.code} lang={l.code}>
              <input type="radio" name="lang" checked={lang === l.code} onChange={() => setLang(l.code)} />
              {l.label}
            </label>
          ))}
        </fieldset>
      </section>

      <section className="settings-section" aria-labelledby="set-read">
        <h3 id="set-read">{p.readTitle}</h3>
        {speechSupported ? (
          <>
            <p>{p.readBody}</p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                onClose();
                window.setTimeout(readPage, 260); // after the panel has closed
              }}
            >
              <Speaker />
              {p.readButton}
            </button>
            <div className="settings-row">
              <fieldset className="segmented" style={{ flex: "1 1 220px" }}>
                <legend className="visually-hidden">{p.speed}</legend>
                {RATES.map((r, i) => (
                  <label className="segmented__opt" key={r}>
                    <input type="radio" name="rate" checked={prefs.speechRate === r} onChange={() => setPrefs({ speechRate: r })} />
                    {rateText[i]}
                  </label>
                ))}
              </fieldset>
              {voices.length > 1 && (
                <div className="field">
                  <label className="visually-hidden" htmlFor="voice">
                    {p.voice}
                  </label>
                  <select id="voice" className="select" value={prefs.voiceURI} onChange={(e) => setPrefs({ voiceURI: e.target.value })}>
                    <option value="">{p.defaultVoice}</option>
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </>
        ) : (
          <p>{p.noSpeech}</p>
        )}
      </section>

      <section className="settings-section" aria-labelledby="set-theme">
        <h3 id="set-theme">{p.colors}</h3>
        <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <legend className="visually-hidden">{p.theme}</legend>
          <div className="choices">
            {THEMES.map((th) => (
              <label className="choice choice--radio choice--swatch" key={th}>
                <input type="radio" name="theme" checked={prefs.theme === th} onChange={() => setPrefs({ theme: th })} />
                <span className="choice__indicator" aria-hidden>
                  <span className="choice__dot" />
                </span>
                <span className={`swatch swatch--${th}`} aria-hidden>
                  Aa
                </span>
                <span className="choice__text">
                  <span className="choice__title">{themeText[th][0]}</span>
                  <span className="choice__desc">{themeText[th][1]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="settings-section" aria-labelledby="set-text">
        <h3 id="set-text">{p.text}</h3>
        <span className="settings-label" id="size-label">
          {p.textSize}
        </span>
        <fieldset className="segmented" aria-labelledby="size-label">
          {SIZES.map((s, i) => (
            <label className="segmented__opt" key={s.value}>
              <input
                type="radio"
                name="size"
                aria-label={p.sizes[i]}
                checked={prefs.textSize === s.value}
                onChange={() => setPrefs({ textSize: s.value })}
              />
              <span aria-hidden>{s.label}</span>
            </label>
          ))}
        </fieldset>
        <div className="choices" style={{ marginTop: 12 }}>
          <label className="choice">
            <input type="checkbox" checked={prefs.readableFont} onChange={(e) => setPrefs({ readableFont: e.target.checked })} />
            {check}
            <span className="choice__text">
              <span className="choice__title">{p.fontTitle}</span>
              <span className="choice__desc">{p.fontDesc}</span>
            </span>
          </label>
          <label className="choice">
            <input type="checkbox" checked={prefs.reduceMotion} onChange={(e) => setPrefs({ reduceMotion: e.target.checked })} />
            {check}
            <span className="choice__text">
              <span className="choice__title">{p.motionTitle}</span>
              <span className="choice__desc">{p.motionDesc}</span>
            </span>
          </label>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="set-cal">
        <h3 id="set-cal">{p.calTitle}</h3>
        {cal.connection ? (
          <>
            <p className="status-line">
              <span className="status-dot status-dot--on" aria-hidden />
              {p.connectedAs(cal.connection.email)}
            </p>
            <p>{p.connectedBody}</p>
            <button type="button" className="btn btn--secondary" onClick={cal.disconnect}>
              {p.disconnect}
            </button>
          </>
        ) : cal.configured ? (
          <>
            <p className="status-line">
              <span className="status-dot" aria-hidden />
              {p.notConnected}
            </p>
            <p>{p.notConnectedBody}</p>
            <button type="button" className="btn btn--secondary" onClick={cal.connect} disabled={cal.busy}>
              {cal.busy ? p.waiting : p.connect}
            </button>
            {cal.error && (
              <p className="field__error" role="alert" style={{ marginTop: 10 }}>
                {cal.error}
              </p>
            )}
          </>
        ) : (
          <p>{p.noSetupBody}</p>
        )}
      </section>

      <div className="dialog__footer">
        <button type="button" className="btn btn--ghost" onClick={resetPrefs}>
          {p.reset}
        </button>
        <button type="button" className="btn btn--primary" onClick={onClose}>
          {p.done}
        </button>
      </div>
    </Dialog>
  );
}
