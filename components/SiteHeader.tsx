"use client";

import { useState } from "react";
import Link from "next/link";
import { LANGS, isLang } from "@/lib/i18n";
import { useA11y } from "./A11yProvider";
import { useI18n } from "./I18nProvider";
import AccessibilityPanel from "./AccessibilityPanel";
import { Chat, Globe, MoonMark, Sliders, Speaker } from "./Icons";

export default function SiteHeader() {
  const { lang, setLang, t } = useI18n();
  const { speechSupported, readState, readPage, stop } = useA11y();
  const [panelOpen, setPanelOpen] = useState(false);
  const reading = readState !== "idle";

  return (
    <>
      <a className="skip-link" href="#main">
        {t.header.skip}
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link href="/" className="brand" aria-label={t.header.home}>
            <MoonMark className="brand__mark" />
            <span className="btn__label">AccessCare Navigator</span>
          </Link>
          <div className="site-header__actions">
            <Link href="/guide" className="btn btn--ghost btn--icon-label">
              <Chat />
              <span className="btn__label">{t.header.guide}</span>
            </Link>
            {speechSupported && (
              <button type="button" className="btn btn--ghost btn--icon-label" onClick={reading ? stop : readPage}>
                <Speaker />
                <span className="btn__label">{reading ? t.header.stopReading : t.header.readAloud}</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn--ghost btn--icon-label"
              aria-haspopup="dialog"
              onClick={() => setPanelOpen(true)}
            >
              <Sliders />
              <span className="btn__label">{t.header.display}</span>
            </button>
            <label className="lang-select">
              <Globe />
              <span className="visually-hidden">{t.common.language}</span>
              <select
                value={lang}
                onChange={(e) => {
                  if (isLang(e.target.value)) setLang(e.target.value);
                }}
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code} lang={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>
      {/* Outside the header so its blur/mask never touch the dialog */}
      <AccessibilityPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
