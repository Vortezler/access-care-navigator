import type { Metadata, Viewport } from "next";
import I18nProvider from "@/components/I18nProvider";
import A11yProvider from "@/components/A11yProvider";
import CalendarProvider from "@/components/CalendarProvider";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ReadAloudBar from "@/components/ReadAloudBar";
import ScrollEffects from "@/components/ScrollEffects";
import { PREFS_BOOT_SCRIPT } from "@/lib/prefs";
import { LANG_BOOT_SCRIPT } from "@/lib/i18n";
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
    // Saved display preferences and language set attributes here before hydration.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT + LANG_BOOT_SCRIPT }} />
      </head>
      <body>
        <I18nProvider>
          <A11yProvider>
            <CalendarProvider>
              <SiteHeader />
              <main id="main" tabIndex={-1}>
                {children}
              </main>
              <SiteFooter />
              <ReadAloudBar />
              <ScrollEffects />
            </CalendarProvider>
          </A11yProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
