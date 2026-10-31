"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Clinic, Specialty } from "@/lib/types";
import { ACCESSIBILITY_KEYS } from "@/lib/types";
import { loadSession, type StoredSession } from "@/lib/session";
import ClinicCard from "@/components/ClinicCard";
import { useT } from "@/components/I18nProvider";
import BookingModal from "@/components/BookingModal";
import AdvocacyScriptModal from "@/components/AdvocacyScriptModal";
import MessageModal from "@/components/MessageModal";
import { ArrowLeft, MoonMark } from "@/components/Icons";

export default function ResultsPage() {
  const t = useT();
  const r = t.results;
  const [session, setSession] = useState<StoredSession | null | undefined>(undefined);
  // Keep the clinic separate from `open` so content stays put during the exit animation.
  const [bookClinic, setBookClinic] = useState<Clinic | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [scriptClinic, setScriptClinic] = useState<Clinic | null>(null);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [msgClinic, setMsgClinic] = useState<Clinic | null>(null);
  const [msgOpen, setMsgOpen] = useState(false);

  useEffect(() => {
    setSession(loadSession());
  }, []);

  if (session === undefined) return <div className="page" aria-busy="true" />;

  if (!session) {
    return (
      <div className="page page--narrow">
        <div className="panel empty reveal">
          <span style={{ display: "flex", justifyContent: "center" }}>
            <MoonMark size={36} className="brand__mark" />
          </span>
          <h1 className="display" style={{ fontSize: "2rem", marginTop: 14 }}>
            {r.emptyTitle}
          </h1>
          <p className="lede" style={{ margin: "10px auto 0" }}>
            {r.emptyBody}
          </p>
          <Link href="/" className="btn btn--primary">
            {r.start}
          </Link>
        </div>
      </div>
    );
  }

  const { intake, results } = session;
  const sp = t.specialties[intake.specialty as Specialty] ?? intake.specialty;
  const needCount = ACCESSIBILITY_KEYS.filter((k) => intake.accessibilityRequirements[k]).length;

  return (
    <div className="page">
      <div className="results-head">
        <div>
          <p className="eyebrow reveal">
            <MoonMark size={16} />
            {r.checked(results.length)}
          </p>
          <h1 className="display reveal" style={{ ["--i" as string]: 1 }}>
            {r.title(sp)}
          </h1>
          <div className="badges summary reveal" style={{ ["--i" as string]: 1 }}>
            <span className="badge">{r.insurance(intake.insurancePayer)}</span>
            <span className="badge">
              {r.needs(needCount)}
            </span>
            <span className="badge">{r.within(intake.urgencyWindowDays)}</span>
          </div>
        </div>
        <Link href="/?edit=1" className="btn btn--secondary reveal" style={{ ["--i" as string]: 2 }}>
          <ArrowLeft />
          {r.edit}
        </Link>
      </div>

      {results.length === 0 ? (
        <div className="panel empty reveal">
          <h2>{r.noneTitle(sp)}</h2>
          <p className="muted">{r.noneBody}</p>
          <Link href="/?edit=1" className="btn btn--primary">
            {r.edit}
          </Link>
        </div>
      ) : (
        <ol className="results-list" aria-label={r.listLabel}>
          {results.map((r, i) => (
            <ClinicCard
              key={r.clinic.id}
              result={r}
              index={i}
              intake={intake}
              onBook={() => {
                setBookClinic(r.clinic);
                setBookOpen(true);
              }}
              onMessage={() => {
                setMsgClinic(r.clinic);
                setMsgOpen(true);
              }}
              onScript={() => {
                setScriptClinic(r.clinic);
                setScriptOpen(true);
              }}
            />
          ))}
        </ol>
      )}

      <BookingModal
        clinic={bookClinic}
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        intake={intake}
      />
      <AdvocacyScriptModal clinic={scriptClinic} intake={intake} open={scriptOpen} onClose={() => setScriptOpen(false)} />
      <MessageModal clinic={msgClinic} intake={intake} open={msgOpen} onClose={() => setMsgOpen(false)} />
    </div>
  );
}
