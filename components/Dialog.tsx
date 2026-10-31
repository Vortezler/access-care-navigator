"use client";

import { useEffect, useId, useRef } from "react";
import { Close } from "./Icons";
import { useT } from "./I18nProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Native <dialog> for built-in focus trapping, Esc handling and focus return.
 * We only add a symmetric exit animation: closing retraces the entrance path,
 * and reopening mid-exit cancels the close instead of waiting for it.
 */
export default function Dialog({ open, onClose, title, subtitle, children }: Props) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const closeTimer = useRef<number | null>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;

    const finish = () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
      d.removeAttribute("data-closing");
      if (d.open) d.close();
    };

    if (open) {
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      d.removeAttribute("data-closing");
      if (!d.open) d.showModal();
      return;
    }

    if (d.open && !d.hasAttribute("data-closing")) {
      d.setAttribute("data-closing", "");
      const onEnd = (e: AnimationEvent) => {
        if (e.target === d) finish();
      };
      d.addEventListener("animationend", onEnd);
      closeTimer.current = window.setTimeout(finish, 320); // safety net if animations are disabled
      return () => d.removeEventListener("animationend", onEnd);
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault(); // let our exit animation run
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on backdrop
      }}
    >
      <div className="dialog__inner">
        <div className="dialog__head">
          <h2 className="dialog__title" id={titleId}>
            {title}
          </h2>
          <button type="button" className="btn btn--ghost dialog__close" onClick={onClose} aria-label={t.common.close}>
            <Close />
          </button>
        </div>
        {subtitle && <p className="dialog__sub">{subtitle}</p>}
        {children}
      </div>
    </dialog>
  );
}
