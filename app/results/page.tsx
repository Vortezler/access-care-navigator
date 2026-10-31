"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Clinic } from "@/lib/types";
import { ACCESSIBILITY_KEYS } from "@/lib/types";
import { loadSession, type StoredSession } from "@/lib/session";
import ClinicCard from "@/components/ClinicCard";
import BookingModal from "@/components/BookingModal";
import AdvocacyScriptModal from "@/components/AdvocacyScriptModal";
import { ArrowLeft, MoonMark } from "@/components/Icons";

export default function ResultsPage() {
  const [session, setSession] = useState<StoredSession | null | undefined>(undefined);
  // Keep the clinic separate from `open` so content stays put during the exit animation.
  const [bookClinic, setBookClinic] = useState<Clinic | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [scriptClinic, setScriptClinic] = useState<Clinic | null>(null);
  const [scriptOpen, setScriptOpen] = useState(false);

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
            Nothing here yet
          </h1>
          <p className="lede" style={{ margin: "10px auto 0" }}>
            Your results live only in this browser tab. Start a search to see matched clinics.
          </p>
          <Link href="/" className="btn btn--primary">
            Start a search
          </Link>
        </div>
      </div>
    );
  }

  const { intake, results } = session;
  const needCount = ACCESSIBILITY_KEYS.filter((k) => intake.accessibilityRequirements[k]).length;

  return (
    <div className="page">
      <div className="results-head">
        <div>
          <p className="eyebrow reveal">
            <MoonMark size={16} />
            {results.length} {results.length === 1 ? "clinic" : "clinics"} checked
          </p>
          <h1 className="display reveal" style={{ ["--i" as string]: 1 }}>
            Your {intake.specialty} matches
          </h1>
          <div className="badges summary reveal" style={{ ["--i" as string]: 1 }}>
            <span className="badge">Insurance: {intake.insurancePayer}</span>
            <span className="badge">
              {needCount} accessibility {needCount === 1 ? "need" : "needs"}
            </span>
            <span className="badge">Within {intake.urgencyWindowDays} days</span>
          </div>
        </div>
        <Link href="/?edit=1" className="btn btn--secondary reveal" style={{ ["--i" as string]: 2 }}>
          <ArrowLeft />
          Edit search
        </Link>
      </div>

      {results.length === 0 ? (
        <div className="panel empty reveal">
          <h2>No {intake.specialty} clinics in our demo dataset</h2>
          <p className="muted">Try another specialty.</p>
          <Link href="/?edit=1" className="btn btn--primary">
            Edit search
          </Link>
        </div>
      ) : (
        <ol className="results-list" aria-label="Matched clinics, best first">
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
    </div>
  );
}
