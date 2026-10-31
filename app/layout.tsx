import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { MoonMark } from "@/components/Icons";
import "./globals.css";

export const metadata: Metadata = {
  title: "AccessCare Navigator",
  description: "Find specialists who actually meet your accessibility needs — then book, or get a call script that does the advocating for you.",
};

export const viewport: Viewport = {
  themeColor: "#0d0b12",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <header className="site-header">
          <div className="site-header__inner">
            <Link href="/" className="brand" aria-label="AccessCare Navigator, home">
              <MoonMark className="brand__mark" />
              <span>AccessCare Navigator</span>
            </Link>
            <Link href="/" className="btn btn--ghost">
              Start over
            </Link>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <p>
            Demo build: clinics are fictional and booking is simulated. Your answers are used only to generate
            this session&rsquo;s results and are never stored.
          </p>
        </footer>
      </body>
    </html>
  );
}
