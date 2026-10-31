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

export function Speaker({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)}>
      <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.5a8 8 0 0 1 0 11" />
    </svg>
  );
}

export function Sliders({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  );
}

export function Play({ size = 16 }: P) {
  return (
    <svg viewBox="0 0 20 20" {...base(size)}>
      <path d="M6.5 4.5v11l9-5.5z" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export function Pause({ size = 16 }: P) {
  return (
    <svg viewBox="0 0 20 20" {...base(size)}>
      <path d="M7 4.5v11M13 4.5v11" strokeWidth={2.2} />
    </svg>
  );
}

export function Stop({ size = 16 }: P) {
  return (
    <svg viewBox="0 0 20 20" {...base(size)}>
      <rect x="5" y="5" width="10" height="10" rx="1" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export function ExternalLink({ size = 14 }: P) {
  return (
    <svg viewBox="0 0 20 20" {...base(size)}>
      <path d="M11 4h5v5M16 4l-7 7M14 11.5V15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3.5" />
    </svg>
  );
}

export function Mic({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)}>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" />
    </svg>
  );
}

export function Compass({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m14.8 9.2-1.9 4.7-4.7 1.9 1.9-4.7z" />
    </svg>
  );
}

export function Chat({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)}>
      <path d="M4.5 5.5h15v10h-8l-4.5 3.5v-3.5h-2.5z" />
      <path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" strokeWidth={2.4} />
    </svg>
  );
}

export function Globe({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5s1.2-6.2 3.6-8.5Z" />
    </svg>
  );
}

export function Paperclip({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)}>
      <path d="m19 11.5-6.8 6.8a4.5 4.5 0 0 1-6.4-6.4l7.4-7.4a3 3 0 0 1 4.2 4.2l-7.3 7.3a1.5 1.5 0 0 1-2.1-2.1l6.6-6.6" />
    </svg>
  );
}

export function Send({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)}>
      <path d="M4.5 12 19.5 4.5l-4 15-3.5-6.5z" />
      <path d="m12 13 7.5-8.5" />
    </svg>
  );
}

export function FileDoc({ size = 16 }: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)}>
      <path d="M6.5 3.5h7l4 4v13h-11z" />
      <path d="M13.5 3.5v4h4M9 13h6M9 16.5h6" />
    </svg>
  );
}
