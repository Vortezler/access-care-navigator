"use client";

import { useEffect, useState } from "react";
import type { IntakeData, MatchResult } from "@/lib/types";
import { ACCESSIBILITY_KEYS } from "@/lib/types";
import { useT } from "./I18nProvider";
import { Calendar, Check, Cross, Phone, Sparkle } from "./Icons";

interface Props {
  result: MatchResult;
  index: number;
  intake: IntakeData;
  onBook: () => void;
  onScript: () => void;
}

const R = 34;
const CIRC = 2 * Math.PI * R;

function ScoreRing({ score, delay }: { score: number; delay: number }) {
  // Starts empty, then fills to the score once mounted — the ring "settles" into place.
  const t = useT();
  const [offset, setOffset] = useState(CIRC);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(CIRC * (1 - score / 100)));
    return () => cancelAnimationFrame(id);
  }, [score]);

  return (
    <div className="score" role="img" aria-label={t.card.scoreAria(score)}>
      <svg viewBox="0 0 80 80" aria-hidden>
        <circle className="score__track" cx="40" cy="40" r={R} fill="none" strokeWidth="6" />
        <circle
          className="score__value"
          cx="40"
          cy="40"
          r={R}
          fill="none"
          strokeWidth="6"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          style={{ transitionDelay: `${delay}ms` }}
        />
      </svg>
      <div className="score__label" aria-hidden>
        <div>
          <span className="score__num">{score}</span>
          <span className="score__unit">{t.card.match}</span>
        </div>
      </div>
    </div>
  );
}

export default function ClinicCard({ result, index, intake, onBook, onScript }: Props) {
  const { clinic } = result;
  const t = useT();
  const c = t.card;
  const requested = ACCESSIBILITY_KEYS.filter((k) => intake.accessibilityRequirements[k]);
  const extras = ACCESSIBILITY_KEYS.filter((k) => !intake.accessibilityRequirements[k] && clinic.accessibility[k]);
  const prefersBooking = intake.autonomyMode === "auto_book_preferred";
  const headingId = `clinic-${clinic.id}`;

  const bookBtn = (primary: boolean, label: string) => (
    <button type="button" className={`btn ${primary ? "btn--primary" : "btn--secondary"}`} onClick={onBook} aria-describedby={headingId}>
      <Calendar />
      {label}
    </button>
  );
  const scriptBtn = (primary: boolean) => (
    <button type="button" className={`btn ${primary ? "btn--primary" : "btn--secondary"}`} onClick={onScript} aria-describedby={headingId}>
      <Phone />
      {c.script}
    </button>
  );

  return (
    <li>
      <article
        className={`panel clinic${index === 0 ? " clinic--top" : ""}`}
        data-reveal
        style={{ ["--i" as string]: Math.min(index, 3) }}
        aria-labelledby={headingId}
      >
        <div className="clinic__head">
          <p className="clinic__rank">{index === 0 ? c.best : c.rank(index + 1)}</p>
          <h2 className="clinic__name" id={headingId}>
            {clinic.name}
          </h2>
          <p className="clinic__meta">
            {clinic.address}
            <br />
            <a href={`tel:${clinic.phone.replace(/[^\d+]/g, "")}`}>{clinic.phone}</a>
          </p>
          <div className="badges">
            {result.inNetwork ? (
              <span className="badge badge--ok">
                <Check size={12} /> {c.inNetwork}
              </span>
            ) : (
              <span className="badge badge--warn">
                <Cross size={10} /> {c.outNetwork}
              </span>
            )}
            {clinic.hasOnlineBooking ? (
              <span className="badge badge--accent">{c.online}</span>
            ) : (
              <span className="badge">{c.phoneOnly}</span>
            )}
            <span className={`badge${result.slotsInWindow ? "" : " badge--warn"}`}>
              {result.slotsInWindow
                ? c.openings(result.slotsInWindow, intake.urgencyWindowDays)
                : c.noOpenings(intake.urgencyWindowDays)}
            </span>
          </div>
        </div>

        <ScoreRing score={result.score} delay={160 + index * 90} />

        <div className="clinic__body">
          <section aria-label={c.accessCheck}>
            <h3 className="clinic__subhead">
              {c.needsMet(result.requirementsMetCount, result.requirementsTotalCount)}
            </h3>
            {requested.length === 0 ? (
              <p className="muted" style={{ margin: 0, fontSize: "0.9375rem" }}>
                {c.noNeeds}
              </p>
            ) : (
              <ul className="checklist">
                {requested.map((k) => {
                  const met = clinic.accessibility[k];
                  return (
                    <li key={k}>
                      <span className={`checklist__icon checklist__icon--${met ? "met" : "unmet"}`} aria-hidden>
                        {met ? <Check size={12} /> : <Cross size={10} />}
                      </span>
                      <span>
                        <span className={`checklist__state checklist__state--${met ? "met" : "unmet"}`}>
                          {met ? c.yes : c.no}
                        </span>
                        <span className="visually-hidden">:</span> {t.access.labels[k]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {extras.length > 0 && (
              <p className="muted" style={{ margin: "12px 0 0", fontSize: "0.875rem" }}>
                {c.alsoOffers(extras.map((k) => t.access.labels[k]).join(", "))}
              </p>
            )}
          </section>

          <section aria-label={c.why}>
            <h3 className="clinic__subhead">{c.why}</h3>
            <p className="clinic__explanation">{result.explanation}</p>
            <p className="source-tag">
              {result.explanationSource !== "template" && <Sparkle />}
              {c.source[result.explanationSource]}
            </p>
          </section>
        </div>

        <div className="clinic__actions">
          {clinic.hasOnlineBooking ? (
            prefersBooking ? (
              <>
                {bookBtn(true, c.book)}
                {scriptBtn(false)}
              </>
            ) : (
              <>
                {scriptBtn(true)}
                {bookBtn(false, c.bookInstead)}
              </>
            )
          ) : (
            scriptBtn(true)
          )}
        </div>
      </article>
    </li>
  );
}
