"use client";

import { useEffect } from "react";

/**
 * - Reveals [data-reveal] elements as they scroll into view (once each).
 * - Flags the root while scrolled so the header material can thicken.
 * Content is only hidden after this runs (data-sr), so it's never lost without JS.
 */
export default function ScrollEffects() {
  useEffect(() => {
    const root = document.documentElement;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-revealed", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const watch = () =>
      document.querySelectorAll("[data-reveal]:not([data-revealed])").forEach((el) => io.observe(el));

    root.setAttribute("data-sr", "");
    watch();
    // Results render after hydration and pages change client-side: pick up new elements.
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (window.scrollY > 8) root.setAttribute("data-scrolled", "");
        else root.removeAttribute("data-scrolled");
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", onScroll);
      root.removeAttribute("data-sr");
    };
  }, []);

  return null;
}
