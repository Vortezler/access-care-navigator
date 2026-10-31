"use client";

import type { TextSize, Theme } from "@/lib/prefs";
import { useA11y } from "./A11yProvider";
import { useCalendar } from "./CalendarProvider";
import Dialog from "./Dialog";
import { Speaker } from "./Icons";

interface Props {
  open: boolean;
  onClose: () => void;
}

const THEMES: { value: Theme; title: string; desc: string; swatch: string }[] = [
  { value: "night", title: "Night", desc: "Dark and calm. The default.", swatch: "night" },
  { value: "day", title: "Day", desc: "Light background, dark text.", swatch: "day" },
  { value: "contrast", title: "High contrast", desc: "Black, white and yellow. No transparency.", swatch: "contrast" },
];

const SIZES: { value: TextSize; label: string; name: string }[] = [
  { value: "md", label: "A", name: "Default text size" },
  { value: "lg", label: "A+", name: "Large text" },
  { value: "xl", label: "A++", name: "Larger text" },
  { value: "xxl", label: "A+++", name: "Largest text" },
];

const RATES = [
  { value: 0.75, label: "Slow" },
  { value: 1, label: "Normal" },
  { value: 1.25, label: "Fast" },
];

export default function AccessibilityPanel({ open, onClose }: Props) {
  const { prefs, setPrefs, resetPrefs, speechSupported, voices, readPage } = useA11y();
  const cal = useCalendar();

  const check = (
    <span className="choice__indicator" aria-hidden>
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path className="choice__check" d="m3.5 8.4 2.9 2.8 6.1-6.4" />
      </svg>
    </span>
  );

  return (
    <Dialog open={open} onClose={onClose} title="Display & reading" subtitle="Saved in this browser only. Changes apply right away.">
      <section className="settings-section" aria-labelledby="set-read">
        <h3 id="set-read">Read aloud</h3>
        {speechSupported ? (
          <>
            <p>Hear the page spoken, with each part highlighted as it&rsquo;s read.</p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                onClose();
                window.setTimeout(readPage, 260); // after the panel has closed
              }}
            >
              <Speaker />
              Read this page aloud
            </button>
            <div className="settings-row">
              <fieldset className="segmented" style={{ flex: "1 1 220px" }}>
                <legend className="visually-hidden">Reading speed</legend>
                {RATES.map((r) => (
                  <label className="segmented__opt" key={r.value}>
                    <input
                      type="radio"
                      name="rate"
                      checked={prefs.speechRate === r.value}
                      onChange={() => setPrefs({ speechRate: r.value })}
                    />
                    {r.label}
                  </label>
                ))}
              </fieldset>
              {voices.length > 1 && (
                <div className="field">
                  <label className="visually-hidden" htmlFor="voice">
                    Voice
                  </label>
                  <select
                    id="voice"
                    className="select"
                    value={prefs.voiceURI}
                    onChange={(e) => setPrefs({ voiceURI: e.target.value })}
                  >
                    <option value="">Default voice</option>
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
          <p>This browser doesn&rsquo;t support speech. Your screen reader works with every part of this site.</p>
        )}
      </section>

      <section className="settings-section" aria-labelledby="set-theme">
        <h3 id="set-theme">Colors</h3>
        <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <legend className="visually-hidden">Color theme</legend>
          <div className="choices">
            {THEMES.map((t) => (
              <label className="choice choice--radio choice--swatch" key={t.value}>
                <input type="radio" name="theme" checked={prefs.theme === t.value} onChange={() => setPrefs({ theme: t.value })} />
                <span className="choice__indicator" aria-hidden>
                  <span className="choice__dot" />
                </span>
                <span className={`swatch swatch--${t.swatch}`} aria-hidden>
                  Aa
                </span>
                <span className="choice__text">
                  <span className="choice__title">{t.title}</span>
                  <span className="choice__desc">{t.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="settings-section" aria-labelledby="set-text">
        <h3 id="set-text">Text</h3>
        <span className="settings-label" id="size-label">
          Text size
        </span>
        <fieldset className="segmented" aria-labelledby="size-label">
          {SIZES.map((s) => (
            <label className="segmented__opt" key={s.value}>
              <input
                type="radio"
                name="size"
                aria-label={s.name}
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
              <span className="choice__title">Easier-to-read font</span>
              <span className="choice__desc">Atkinson Hyperlegible, with wider letter, word and line spacing</span>
            </span>
          </label>
          <label className="choice">
            <input type="checkbox" checked={prefs.reduceMotion} onChange={(e) => setPrefs({ reduceMotion: e.target.checked })} />
            {check}
            <span className="choice__text">
              <span className="choice__title">Reduce motion</span>
              <span className="choice__desc">Gentle fades instead of sliding and zooming</span>
            </span>
          </label>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="set-cal">
        <h3 id="set-cal">Google Calendar</h3>
        {cal.connection ? (
          <>
            <p className="status-line">
              <span className="status-dot status-dot--on" aria-hidden />
              Connected{cal.connection.email ? ` as ${cal.connection.email}` : ""}
            </p>
            <p>
              Bookings and call reminders go straight onto your calendar, and openings that clash with your schedule are
              flagged. The connection is stored only in this browser.
            </p>
            <button type="button" className="btn btn--secondary" onClick={cal.disconnect}>
              Disconnect and forget
            </button>
          </>
        ) : cal.configured ? (
          <>
            <p className="status-line">
              <span className="status-dot" aria-hidden />
              Not connected
            </p>
            <p>
              Connect to add appointments in one click and see which openings clash with your schedule. There&rsquo;s no
              account here: the connection is saved only in this browser, and you can disconnect at any time.
            </p>
            <button type="button" className="btn btn--secondary" onClick={cal.connect} disabled={cal.busy}>
              {cal.busy ? "Waiting for Google…" : "Connect Google Calendar"}
            </button>
            {cal.error && (
              <p className="field__error" role="alert" style={{ marginTop: 10 }}>
                {cal.error}
              </p>
            )}
          </>
        ) : (
          <p>
            &ldquo;Add to Google Calendar&rdquo; buttons open Google Calendar with the event already filled in, so there&rsquo;s
            nothing to set up. You can also download an .ics file for any calendar app.
          </p>
        )}
      </section>

      <div className="dialog__footer">
        <button type="button" className="btn btn--ghost" onClick={resetPrefs}>
          Reset display settings
        </button>
        <button type="button" className="btn btn--primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Dialog>
  );
}
