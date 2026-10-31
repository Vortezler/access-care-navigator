"use client";

import Link from "next/link";
import IntakeForm from "@/components/IntakeForm";
import { useT } from "@/components/I18nProvider";
import { Chat, Cobweb, MoonMark } from "@/components/Icons";

export default function Home() {
  const t = useT();
  return (
    <div className="page page--narrow">
      <section className="hero" aria-labelledby="hero-title">
        <Cobweb className="hero__web" />
        <p className="eyebrow reveal">
          <MoonMark size={16} />
          {t.hero.eyebrow}
        </p>
        <h1 id="hero-title" className="display reveal" style={{ ["--i" as string]: 1 }}>
          {t.hero.titleBefore}
          <em>{t.hero.titleEm}</em>
          {t.hero.titleAfter}
        </h1>
        <p className="lede reveal" style={{ ["--i" as string]: 1 }}>
          {t.hero.lede}
        </p>
        <Link href="/guide" className="guide-cta reveal" style={{ ["--i" as string]: 2 }}>
          <Chat />
          <span>{t.hero.guideCta}</span>
          <span aria-hidden>→</span>
        </Link>
      </section>
      <IntakeForm />
    </div>
  );
}
