"use client";

import { forwardRef } from "react";
import type { Specialty, SpecialtySuggestion, TextSource } from "@/lib/types";
import { useT } from "./I18nProvider";
import { Alert, Sparkle } from "./Icons";

interface Props {
  suggestion: SpecialtySuggestion;
  source: TextSource;
  /** The specialty currently selected in the form */
  selected: string;
  /** The description changed after this suggestion was made */
  stale: boolean;
  onChoose: (s: Specialty) => void;
}

const SuggestionCard = forwardRef<HTMLHeadingElement, Props>(function SuggestionCard(
  { suggestion: s, source, selected, stale, onChoose },
  headingRef,
) {
  const t = useT();
  const g = t.suggest;
  const name = (sp: string) => t.specialties[sp as Specialty] ?? sp;

  return (
    <section className="suggestion reveal" aria-labelledby="suggestion-title">
      {s.urgency === "emergency" && (
        <div className="emergency" role="alert">
          <h3>{g.emergencyTitle}</h3>
          <p>
            {s.urgencyNote || g.emergencyDefault} {g.dontWait}
          </p>
        </div>
      )}

      <div className="suggestion__head">
        <h3 className="suggestion__title" id="suggestion-title" ref={headingRef} tabIndex={-1}>
          {g.suggested} <strong>{name(s.specialty)}</strong>
        </h3>
        <span className="badge">{g.confidence[s.confidence]}</span>
      </div>

      {s.urgency === "urgent" && (
        <p className="urgent-note">
          {s.urgencyNote || g.urgentDefault} {g.narrowed}
        </p>
      )}

      <p>{s.reasoning}</p>

      <p className="inline-note" style={{ marginTop: 0 }}>
        {stale ? g.stale : selected === s.specialty ? g.selectedNote(name(s.specialty)) : g.otherChosen(name(selected))}
      </p>

      {(s.alternatives.length > 0 || s.specialty !== "Primary Care") && (
        <div className="suggestion__alts">
          {s.alternatives.map((a) => (
            <div className="alt" key={a.specialty}>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => onChoose(a.specialty)}
                aria-pressed={selected === a.specialty}
              >
                {g.choose(name(a.specialty))}
              </button>
              <span>{a.reason}</span>
            </div>
          ))}
          {s.specialty !== "Primary Care" && !s.alternatives.some((a) => a.specialty === "Primary Care") && (
            <div className="alt">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => onChoose("Primary Care")}
                aria-pressed={selected === "Primary Care"}
              >
                {g.choose(name("Primary Care"))}
              </button>
              <span>{g.primaryReason}</span>
            </div>
          )}
          {selected !== s.specialty && (
            <div className="alt">
              <button type="button" className="btn btn--ghost" onClick={() => onChoose(s.specialty)}>
                {g.goBack(name(s.specialty))}
              </button>
            </div>
          )}
        </div>
      )}

      <p className="disclaimer" id="suggestion-disclaimer">
        <Alert size={16} />
        <span>
          <strong>{g.disclaimerStrong}</strong> {g.disclaimerBody}
        </span>
      </p>

      <p className="source-tag">
        {source !== "template" && <Sparkle />}
        {g.source[source]}
      </p>
    </section>
  );
});

export default SuggestionCard;
