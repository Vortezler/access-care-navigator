import type { Metadata, Viewport } from "next";
import A11yProvider from "@/components/A11yProvider";
import CalendarProvider from "@/components/CalendarProvider";
import SiteHeader from "@/components/SiteHeader";
import ReadAloudBar from "@/components/ReadAloudBar";
import ScrollEffects from "@/components/ScrollEffects";
import { PREFS_BOOT_SCRIPT } from "@/lib/prefs";
import "./globals.css";

export const metadata: Metadata = {
  title: "AccessCare Navigator",
  description: "Find specialists who actually meet your accessibility needs — then book, or get a call script that does the advocating for you.",
};

export const viewport: Viewport = {
  themeColor: "#0d0b12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Saved display preferences set data-* attributes here before hydration.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT }} />
      </head>
      <body>
        <A11yProvider>
          <CalendarProvider>
            <a className="skip-link" href="#main">
              Skip to main content
            </a>
            <SiteHeader />
            <main id="main" tabIndex={-1}>
              {children}
            </main>
            <footer className="site-footer">
              <p>
                Demo build: clinics are fictional and booking is simulated. Your answers are used only to generate this
                session&rsquo;s results and are never stored. Nothing on this site is medical advice. Talk to a doctor
                about your symptoms, and in an emergency call 911.
              </p>
            </footer>
            <ReadAloudBar />
            <ScrollEffects />
          </CalendarProvider>
        </A11yProvider>
      </body>
    </html>
  );
}
