// Small inline icon set. All decorative (aria-hidden) — meaning is always carried by adjacent text.

type P = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
});

/** Crescent moon with a tiny star — the brand mark. */
export function MoonMark({ size = 26, className }: P) {
  return (
    <svg viewBox="0 0 28 28" className={className} {...base(size)}>
      <path d="M19.5 18.8A8.6 8.6 0 0 1 10.9 6.2a8.6 8.6 0 1 0 11.4 11.3 8.5 8.5 0 0 1-2.8 1.3Z" fill="currentColor" fillOpacity="0.16" />
      <path d="M21.5 5.5v3M20 7h3" strokeWidth="1.5" />
    </svg>
  );
}

export function Check({ size = 14, className }: P) {
  return (
    <svg viewBox="0 0 16 16" className={className} {...base(size)} strokeWidth={2.2}>
      <path d="m3.5 8.4 2.9 2.8 6.1-6.4" />
    </svg>
  );
}

export function Cross({ size = 12, className }: P) {
  return (
    <svg viewBox="0 0 16 16" className={className} {...base(size)} strokeWidth={2.2}>
      <path d="m4.5 4.5 7 7m0-7-7 7" />
    </svg>
  );
}

export function Close({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 20 20" {...base(size)}>
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}

export function Phone({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)}>
      <path d="M5 4h3.2l1.6 4-2 1.3a11 11 0 0 0 5 5l1.3-2 4 1.6V17a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

export function Calendar({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function Copy({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)}>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

export function Sparkle({ size = 14 }: P) {
  return (
    <svg viewBox="0 0 16 16" {...base(size)} strokeWidth={1.5}>
      <path d="M8 2.5 9.3 6.7 13.5 8 9.3 9.3 8 13.5 6.7 9.3 2.5 8l4.2-1.3Z" />
    </svg>
  );
}

export function Alert({ size = 16 }: P) {
  return (
    <svg viewBox="0 0 20 20" {...base(size)}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v4.5M10 13.6v.1" />
    </svg>
  );
}

export function ArrowLeft({ size = 16 }: P) {
  return (
    <svg viewBox="0 0 20 20" {...base(size)}>
      <path d="M16 10H4m5-5-5 5 5 5" />
    </svg>
  );
}

/** Corner cobweb — purely decorative, drawn at very low opacity. */
export function Cobweb({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" stroke="currentColor" strokeWidth="1" aria-hidden focusable={false}>
      <path d="M120 0 20 100M120 0 0 60M120 0 60 120M120 0 0 20M120 0 100 120" />
      <path d="M96 4c-2 8 2 16 8 18 6 2 12 0 14-4" />
      <path d="M72 6c-4 18 6 34 20 40 14 6 26 2 26-2" />
      <path d="M48 8c-6 30 10 56 34 66 22 10 36 4 36 4" />
      <path d="M24 12c-8 42 14 78 46 92 30 12 48 8 48 8" />
    </svg>
  );
}
