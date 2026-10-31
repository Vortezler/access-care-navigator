"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useA11y } from "./A11yProvider";
import { useT } from "./I18nProvider";
import { Pause, Play, Stop } from "./Icons";

/**
 * Floating player shown while reading. A modal <dialog> makes the rest of the page
 * inert, so while one is open the bar is portalled inside it to stay reachable.
 */
export default function ReadAloudBar() {
  const { readState, readLabel, pause, resume, stop } = useA11y();
  const t = useT();
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    const pick = () => setHost(document.querySelector("dialog[open] .dialog__inner") ?? document.body);
    pick();
    const mo = new MutationObserver(pick);
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
    return () => mo.disconnect();
  }, []);

  if (readState === "idle" || !host) return null;

  return createPortal(
    <div className="read-bar" role="region" aria-label={t.reader.controls}>
      <span className="read-bar__label">
        <span className="eq" aria-hidden data-paused={readState === "paused" ? "" : undefined}>
          <span />
          <span />
          <span />
        </span>
        {readState === "paused" ? t.reader.paused : readLabel}
      </span>
      {readState === "playing" ? (
        <button type="button" className="btn btn--ghost" onClick={pause}>
          <Pause />
          {t.reader.pause}
        </button>
      ) : (
        <button type="button" className="btn btn--ghost" onClick={resume}>
          <Play />
          {t.reader.resume}
        </button>
      )}
      <button type="button" className="btn btn--secondary" onClick={stop}>
        <Stop />
        {t.reader.stop}
      </button>
    </div>,
    host,
  );
}
