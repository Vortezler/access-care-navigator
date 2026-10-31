"use client";

import { useT } from "./I18nProvider";

export default function SiteFooter() {
  const t = useT();
  return (
    <footer className="site-footer">
      <p>{t.footer}</p>
    </footer>
  );
}
