"use client";

import { forwardRef } from "react";
import type { Specialty, SpecialtySuggestion, TextSource } from "@/lib/types";
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

const CONFIDENCE: Record<SpecialtySuggestion["confidence"], string> = {
  high: "Strong match",
  medium: "Likely match",
  low: "Best guess",
};

const SuggestionCard = forwardRef<HTMLHeadingElement, Props>(function SuggestionCard(
  { suggestion: s, source, selected, stale, onChoose },
  headingRef,
) {
  return (
    <section className="suggestion reveal" aria-labelledby="suggestion-title">
      {s.urgency === "emergency" && (
        <div className="emergency" role="alert">
          <h3>This may need emergency care</h3>
          <p>
            {s.urgencyNote ||
              "Some of what you describe can be a sign of an emergency. Call 911 or go to the nearest emergency room now."}{" "}
            Don&rsquo;t wait for an appointment.
          </p>
        </div>
      )}

      <div className="suggestion__head">
        <h3 className="suggestion__title" id="suggestion-title" ref={headingRef} tabIndex={-1}>
          Suggested: <strong>{s.specialty}</strong>
        </h3>
        <span className="badge">{CONFIDENCE[s.confidence]}</span>
      </div>

      {s.urgency === "urgent" && (
        <p className="urgent-note">
          {s.urgencyNote || "Try to be seen within a day or two."} We&rsquo;ve narrowed your time window to match.
        </p>
      )}

      <p>{s.reasoning}</p>

      {stale ? (
        <p className="inline-note" style={{ marginTop: 0 }}>
          You&rsquo;ve changed your description since this suggestion. Choose &ldquo;Suggest again&rdquo; to update it.
        </p>
      ) : (
        <p className="inline-note" style={{ marginTop: 0 }}>
          {selected === s.specialty
            ? `${s.specialty} is now selected below. You can change it at any time.`
            : `You've chosen ${selected || "a different specialty"} instead. That's fine — it's your call.`}
        </p>
      )}

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
                Choose {a.specialty}
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
                Choose Primary Care
              </button>
              <span>See a general physician first. They can confirm what you need and refer you.</span>
            </div>
          )}
          {selected !== s.specialty && (
            <div className="alt">
              <button type="button" className="btn btn--ghost" onClick={() => onChoose(s.specialty)}>
                Go back to {s.specialty}
              </button>
            </div>
          )}
        </div>
      )}

      <p className="disclaimer" id="suggestion-disclaimer">
        <Alert size={16} />
        <span>
          <strong>This isn&rsquo;t a diagnosis or medical advice.</strong> It&rsquo;s an AI suggestion to help you find the
          right kind of clinic, and it can be wrong. It&rsquo;s best to check with a general physician or your own doctor
          before booking a specialist. They can confirm what you need, and some insurance plans require their referral.
          If you think it&rsquo;s an emergency, call 911.
        </span>
      </p>

      <p className="source-tag">
        {source !== "template" && <Sparkle />}
        {source === "bedrock"
          ? "Suggested by Claude via AWS Bedrock"
          : source === "anthropic"
            ? "Suggested by Claude"
            : "AI unavailable: defaulting to a general physician"}
      </p>
    </section>
  );
});

export default SuggestionCard;
