"use client";

import { useState } from "react";
import Link from "next/link";
import { useA11y } from "./A11yProvider";
import AccessibilityPanel from "./AccessibilityPanel";
import { MoonMark, Sliders, Speaker } from "./Icons";

export default function SiteHeader() {
  const { speechSupported, readState, readPage, stop } = useA11y();
  const [panelOpen, setPanelOpen] = useState(false);
  const reading = readState !== "idle";

  return (
    <>
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand" aria-label="AccessCare Navigator, home">
          <MoonMark className="brand__mark" />
          <span className="btn__label">AccessCare Navigator</span>
        </Link>
        <div className="site-header__actions">
          {speechSupported && (
            <button
              type="button"
              className="btn btn--ghost btn--icon-label"
              onClick={reading ? stop : readPage}
            >
              <Speaker />
              <span className="btn__label">{reading ? "Stop reading" : "Read aloud"}</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--icon-label"
            aria-haspopup="dialog"
            onClick={() => setPanelOpen(true)}
          >
            <Sliders />
            <span className="btn__label">Display</span>
          </button>
          <Link href="/" className="btn btn--ghost btn--icon-label">
            Start over
          </Link>
        </div>
      </div>
    </header>
    {/* Outside the header so its blur/mask never touch the dialog */}
    <AccessibilityPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
