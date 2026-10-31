"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useA11y } from "./A11yProvider";
import { Pause, Play, Stop } from "./Icons";

/**
 * Floating player shown while reading. A modal <dialog> makes the rest of the page
 * inert, so while one is open the bar is portalled inside it to stay reachable.
 */
export default function ReadAloudBar() {
  const { readState, readLabel, pause, resume, stop } = useA11y();
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
    <div className="read-bar" role="region" aria-label="Read aloud controls">
      <span className="read-bar__label">
        <span className="eq" aria-hidden data-paused={readState === "paused" ? "" : undefined}>
          <span />
          <span />
          <span />
        </span>
        {readState === "paused" ? "Paused" : readLabel}
      </span>
      {readState === "playing" ? (
        <button type="button" className="btn btn--ghost" onClick={pause}>
          <Pause />
          Pause
        </button>
      ) : (
        <button type="button" className="btn btn--ghost" onClick={resume}>
          <Play />
          Resume
        </button>
      )}
      <button type="button" className="btn btn--secondary" onClick={stop}>
        <Stop />
        Stop
      </button>
    </div>,
    host,
  );
}
