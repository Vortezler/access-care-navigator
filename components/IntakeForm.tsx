"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AccessibilityKey, IntakeData, MatchResult, Specialty, SpecialtySuggestion, TextSource } from "@/lib/types";
import { ACCESSIBILITY_KEYS, ACCESSIBILITY_LABELS, SPECIALTIES } from "@/lib/types";
import { loadIntakeDraft, saveSession } from "@/lib/session";
import { matchSpecialty, normalizeId, parseDays } from "@/lib/voice";
import SuggestionCard from "./SuggestionCard";
import VoiceInput from "./VoiceInput";
import { Alert, Check, Compass } from "./Icons";

/** Spoken names come back lower-case: "jordan rivera" -> "Jordan Rivera" */
const titleCase = (t: string) => t.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
/** Append dictated text to what was already typed, as a new sentence where it makes sense. */
function appendDictation(base: string, spoken: string): string {
  const b = base.trimEnd();
  const t = !b || /[.!?]$/.test(b) ? spoken.charAt(0).toUpperCase() + spoken.slice(1) : spoken;
  return b ? `${b} ${t}` : t;
}

type Form = Omit<IntakeData, "urgencyWindowDays"> & { urgencyWindowDays: string };
type FieldKey = "patientName" | "insurancePayer" | "memberId" | "specialty" | "reasonForVisit" | "urgencyWindowDays";

const EMPTY: Form = {
  patientName: "",
  insurancePayer: "",
  memberId: "",
  specialty: "",
  reasonForVisit: "",
  urgencyWindowDays: "14",
  accessibilityRequirements: {
    wheelchairAccessibleExamRoom: false,
    adjustableHeightExamTable: false,
    sensoryQuietWaitingRoom: false,
    aslInterpreterRequired: false,
    serviceAnimalFriendly: false,
  },
  autonomyMode: "auto_book_preferred",
};

const SAMPLE: Form = {
  patientName: "Jordan Rivera",
  insurancePayer: "Aetna",
  memberId: "AET-4417-2290",
  specialty: "Neurology",
  reasonForVisit: "Recurring migraines with numbness in my left hand over the past month.",
  urgencyWindowDays: "14",
  accessibilityRequirements: {
    wheelchairAccessibleExamRoom: true,
    adjustableHeightExamTable: true,
    sensoryQuietWaitingRoom: false,
    aslInterpreterRequired: true,
    serviceAnimalFriendly: true,
  },
  autonomyMode: "auto_book_preferred",
};

const ACCESS_DESC: Record<AccessibilityKey, string> = {
  wheelchairAccessibleExamRoom: "Room to turn and transfer, step-free entry",
  adjustableHeightExamTable: "Lowers for a safe transfer from a chair",
  sensoryQuietWaitingRoom: "Low light, low noise, a calm place to wait",
  aslInterpreterRequired: "Qualified in-person or video interpreter",
  serviceAnimalFriendly: "Your service animal is welcome in every room",
};

const HAS_HELP = new Set<FieldKey>(["insurancePayer", "memberId", "urgencyWindowDays", "reasonForVisit"]);

const LABELS: Record<FieldKey, string> = {
  patientName: "Your name",
  insurancePayer: "Insurance",
  memberId: "Member ID",
  specialty: "Specialty",
  reasonForVisit: "What's going on? (reason for visit)",
  urgencyWindowDays: "How soon you need to be seen",
};

function validate(f: Form): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {};
  if (!f.patientName.trim()) e.patientName = "Enter your name.";
  if (!f.insurancePayer.trim()) e.insurancePayer = "Enter your insurance company, for example Aetna.";
  if (!f.memberId.trim()) e.memberId = "Enter your member ID.";
  if (!f.specialty) e.specialty = "Choose a specialty.";
  if (!f.reasonForVisit.trim()) e.reasonForVisit = "Tell us briefly why you need this visit.";
  const d = Number(f.urgencyWindowDays);
  if (!Number.isInteger(d) || d < 1 || d > 365) e.urgencyWindowDays = "Enter a whole number of days from 1 to 365.";
  return e;
}

export default function IntakeForm() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const summaryRef = useRef<HTMLDivElement>(null);
  // specialist suggestion
  const [suggestion, setSuggestion] = useState<{ value: SpecialtySuggestion; source: TextSource; forText: string } | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const suggestionHeading = useRef<HTMLHeadingElement>(null);
  const dictationBase = useRef("");

  // "Edit search" from the results page comes back with ?edit=1 — restore the previous answers.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("edit") !== "1") return;
    const draft = loadIntakeDraft();
    if (draft) setForm({ ...draft, urgencyWindowDays: String(draft.urgencyWindowDays) });
  }, []);

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value })); // functional: voice typing fires many quick updates
  }

  // Take keyboard and screen-reader users straight to a new suggestion
  useEffect(() => {
    if (suggestion) suggestionHeading.current?.focus();
  }, [suggestion]);

  // Validate inline once the user has tried to submit
  useEffect(() => {
    if (submitted) setErrors(validate(form));
  }, [form, submitted]);

  async function suggest() {
    const text = form.reasonForVisit.trim();
    setSuggestError(null);
    if (text.length < 3) {
      setSuggestError("Describe what's going on first. A sentence or two is plenty.");
      document.getElementById("reasonForVisit")?.focus();
      return;
    }
    setSuggesting(true);
    setStatus("Thinking about which specialist fits…");
    try {
      const res = await fetch("/api/suggest-specialty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: text }),
      });
      const json = (await res.json()) as { suggestion?: SpecialtySuggestion; source?: TextSource; errors?: string[] };
      if (!res.ok || !json.suggestion) throw new Error(json.errors?.join(" ") || "Couldn't get a suggestion.");
      const sug = json.suggestion;
      setSuggestion({ value: sug, source: json.source ?? "template", forText: text });
      // Choose it for them; they can change it.
      setForm((prev) => ({
        ...prev,
        specialty: sug.specialty,
        urgencyWindowDays:
          sug.urgency === "urgent" && Number(prev.urgencyWindowDays) > 3 ? "3" : prev.urgencyWindowDays,
      }));
      setStatus("");
    } catch (err) {
      setStatus("");
      setSuggestError((err as Error).message);
    } finally {
      setSuggesting(false);
    }
  }

  function chooseSpecialty(sp: Specialty) {
    update("specialty", sp);
    setStatus(`${sp} selected.`);
  }

  function toggleNeed(key: AccessibilityKey) {
    update("accessibilityRequirements", { ...form.accessibilityRequirements, [key]: !form.accessibilityRequirements[key] });
  }

  function fillSample() {
    setForm(SAMPLE);
    setErrors({});
    setStatus("Sample patient filled in. Review and submit when ready.");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setStatus("");
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    const intake: IntakeData = { ...form, urgencyWindowDays: Number(form.urgencyWindowDays) };
    setLoading(true);
    setStatus("Finding accessible clinics for you…");
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intake),
      });
      const json = (await res.json()) as { results?: MatchResult[]; errors?: string[] };
      if (!res.ok || !json.results) throw new Error(json.errors?.join(" ") || "Something went wrong.");
      saveSession({ intake, results: json.results });
      setStatus(`Found ${json.results.length} clinics. Opening results.`);
      router.push("/results");
    } catch (err) {
      setLoading(false);
      setStatus("");
      setServerError((err as Error).message || "We couldn't reach the server. Please try again.");
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  const errorKeys = Object.keys(errors) as FieldKey[];
  const fieldProps = (key: FieldKey) => ({
    id: key,
    name: key,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby":
      [errors[key] ? `${key}-error` : "", HAS_HELP.has(key) ? `${key}-help` : ""].filter(Boolean).join(" ") || undefined,
  });
  const FieldError = ({ k }: { k: FieldKey }) =>
    errors[k] ? (
      <span className="field__error" id={`${k}-error`}>
        <Alert size={15} />
        {errors[k]}
      </span>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={loading}>
      <div className="visually-hidden" role="status" aria-live="polite">
        {status}
      </div>

      <div ref={summaryRef} tabIndex={-1} style={{ outline: "none" }}>
        {(errorKeys.length > 0 || serverError) && (
          <div className="alert reveal" role="alert">
            {serverError ? (
              <>
                <h2>We couldn&rsquo;t search right now</h2>
                <p style={{ margin: 0 }}>{serverError}</p>
              </>
            ) : (
              <>
                <h2>
                  Please fix {errorKeys.length} {errorKeys.length === 1 ? "thing" : "things"} before we search
                </h2>
                <ul>
                  {errorKeys.map((k) => (
                    <li key={k}>
                      <a
                        href={`#${k}`}
                        onClick={(ev) => {
                          ev.preventDefault();
                          document.getElementById(k)?.focus();
                        }}
                      >
                        {LABELS[k]}: {errors[k]}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      <fieldset className="panel" data-reveal style={{ ["--i" as string]: 1 }}>
        <legend className="panel__legend">
          <span className="panel__step" aria-hidden>01</span>About you
        </legend>
        <p className="panel__hint">
          So the clinic knows who&rsquo;s calling. This is a demo — use any details you like. Every box has a microphone
          button if you&rsquo;d rather speak than type.
        </p>
        <div className="field">
          <label className="field__label" htmlFor="patientName">{LABELS.patientName}</label>
          <div className="with-mic">
            <input
              className="input"
              {...fieldProps("patientName")}
              autoComplete="name"
              value={form.patientName}
              onChange={(e) => update("patientName", e.target.value)}
            />
            <VoiceInput fieldLabel="your name" targetId="patientName" onTranscript={(t) => update("patientName", titleCase(t))} />
          </div>
          <FieldError k="patientName" />
        </div>
        <div className="grid-2">
          <div className="field">
            <label className="field__label" htmlFor="insurancePayer">{LABELS.insurancePayer}</label>
            <div className="with-mic">
              <input
                className="input"
                {...fieldProps("insurancePayer")}
                placeholder="e.g. Aetna, Medicaid"
                value={form.insurancePayer}
                onChange={(e) => update("insurancePayer", e.target.value)}
              />
              <VoiceInput
                fieldLabel="your insurance company"
                targetId="insurancePayer"
                onTranscript={(t) => update("insurancePayer", titleCase(t))}
              />
            </div>
            <span className="field__help" id="insurancePayer-help">The company name on your card.</span>
            <FieldError k="insurancePayer" />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="memberId">{LABELS.memberId}</label>
            <div className="with-mic">
              <input
                className="input"
                {...fieldProps("memberId")}
                autoComplete="off"
                spellCheck={false}
                value={form.memberId}
                onChange={(e) => update("memberId", e.target.value)}
              />
              <VoiceInput fieldLabel="your member ID" targetId="memberId" onTranscript={(t) => update("memberId", normalizeId(t))} />
            </div>
            <span className="field__help" id="memberId-help">
              Only used inside your call script. Say &ldquo;dash&rdquo; for a hyphen.
            </span>
            <FieldError k="memberId" />
          </div>
        </div>
      </fieldset>

      <fieldset className="panel" data-reveal style={{ ["--i" as string]: 2 }}>
        <legend className="panel__legend">
          <span className="panel__step" aria-hidden>02</span>The care you need
        </legend>
        <p className="panel__hint">Tell us what&rsquo;s going on. Pick a specialty yourself, or let us suggest one.</p>
        <div className="field">
          <label className="field__label" htmlFor="reasonForVisit">{LABELS.reasonForVisit}</label>
          <div className="with-mic">
            <textarea
              className="textarea"
              {...fieldProps("reasonForVisit")}
              value={form.reasonForVisit}
              onChange={(e) => update("reasonForVisit", e.target.value)}
            />
            <VoiceInput
              fieldLabel="your reason for visit"
              targetId="reasonForVisit"
              continuous
              onStart={() => {
                dictationBase.current = form.reasonForVisit;
              }}
              onTranscript={(t) => update("reasonForVisit", appendDictation(dictationBase.current, t))}
            />
          </div>
          <span className="field__help" id="reasonForVisit-help">
            Your symptoms in your own words: what it feels like, where, for how long, and what makes it better or worse.
          </span>
          <FieldError k="reasonForVisit" />
        </div>

        <div className="suggest-row">
          <button type="button" className="btn btn--secondary" onClick={suggest} disabled={suggesting} aria-describedby="suggest-note">
            {suggesting ? (
              <>
                <span className="dots" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
                Thinking it through…
              </>
            ) : (
              <>
                <Compass />
                {suggestion ? "Suggest again" : "Suggest the right specialist"}
              </>
            )}
          </button>
          <span className="field__help" id="suggest-note">
            An AI suggestion, not medical advice. A general physician can confirm the right specialist.
          </span>
        </div>
        {suggestError && (
          <p className="field__error" role="alert">
            <Alert size={15} />
            {suggestError}
          </p>
        )}
        {suggestion && (
          <SuggestionCard
            ref={suggestionHeading}
            suggestion={suggestion.value}
            source={suggestion.source}
            selected={form.specialty}
            stale={form.reasonForVisit.trim() !== suggestion.forText}
            onChoose={chooseSpecialty}
          />
        )}

        <div className="grid-2" style={{ marginTop: 16 }}>
          <div className="field">
            <label className="field__label" htmlFor="specialty">{LABELS.specialty}</label>
            <div className="with-mic">
              <select
                className="select"
                {...fieldProps("specialty")}
                value={form.specialty}
                onChange={(e) => update("specialty", e.target.value)}
              >
                <option value="" disabled>
                  Choose one…
                </option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <VoiceInput
                fieldLabel="a specialty"
                targetId="specialty"
                onTranscript={(t, isFinal) => {
                  if (!isFinal) return;
                  const sp = matchSpecialty(t);
                  if (sp) chooseSpecialty(sp);
                  else setStatus(`Didn't recognise "${t}" as a specialty. Try saying, for example, "neurology".`);
                }}
              />
            </div>
            <FieldError k="specialty" />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="urgencyWindowDays">Need to be seen within (days)</label>
            <div className="with-mic">
              <input
                className="input"
                {...fieldProps("urgencyWindowDays")}
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                value={form.urgencyWindowDays}
                onChange={(e) => update("urgencyWindowDays", e.target.value)}
              />
              <VoiceInput
                fieldLabel="how many days"
                targetId="urgencyWindowDays"
                onTranscript={(t, isFinal) => {
                  if (!isFinal) return;
                  const d = parseDays(t);
                  if (d !== null) update("urgencyWindowDays", String(d));
                  else setStatus(`Didn't catch a number in "${t}". Try "14" or "two weeks".`);
                }}
              />
            </div>
            <span className="field__help" id="urgencyWindowDays-help">
              We&rsquo;ll highlight openings in this window. You can say &ldquo;two weeks&rdquo;.
            </span>
            <FieldError k="urgencyWindowDays" />
          </div>
        </div>
      </fieldset>

      <fieldset className="panel" data-reveal style={{ ["--i" as string]: 0 }}>
        <legend className="panel__legend">
          <span className="panel__step" aria-hidden>03</span>Accessibility needs
        </legend>
        <p className="panel__hint">Choose everything that matters to you. We check each one, clinic by clinic.</p>
        <div className="choices choices--2">
          {ACCESSIBILITY_KEYS.map((k) => (
            <label className="choice" key={k}>
              <input type="checkbox" checked={form.accessibilityRequirements[k]} onChange={() => toggleNeed(k)} />
              <span className="choice__indicator" aria-hidden>
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path className="choice__check" d="m3.5 8.4 2.9 2.8 6.1-6.4" />
                </svg>
              </span>
              <span className="choice__text">
                <span className="choice__title">{k === "aslInterpreterRequired" ? "ASL interpreter" : ACCESSIBILITY_LABELS[k]}</span>
                <span className="choice__desc">{ACCESS_DESC[k]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="panel" data-reveal style={{ ["--i" as string]: 0 }}>
        <legend className="panel__legend">
          <span className="panel__step" aria-hidden>04</span>How should we help?
        </legend>
        <p className="panel__hint">You stay in control either way.</p>
        <div className="choices choices--2">
          {(
            [
              ["auto_book_preferred", "Try to book for me", "Book online where a clinic allows it; script the rest."],
              ["call_prep_only", "Just prepare a call script", "I'd rather make the call myself, with a script in hand."],
            ] as const
          ).map(([value, title, desc]) => (
            <label className="choice choice--radio" key={value}>
              <input
                type="radio"
                name="autonomyMode"
                value={value}
                checked={form.autonomyMode === value}
                onChange={() => update("autonomyMode", value)}
              />
              <span className="choice__indicator" aria-hidden>
                <span className="choice__dot" />
              </span>
              <span className="choice__text">
                <span className="choice__title">{title}</span>
                <span className="choice__desc">{desc}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="form-actions" data-reveal style={{ ["--i" as string]: 0 }}>
        <button type="submit" className="btn btn--primary btn--lg" disabled={loading}>
          {loading ? (
            <>
              <span className="dots" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              Finding accessible clinics…
            </>
          ) : (
            <>
              <Check size={16} />
              Find accessible clinics
            </>
          )}
        </button>
        <button type="button" className="btn btn--secondary btn--lg" onClick={fillSample} disabled={loading}>
          Use a sample patient
        </button>
      </div>
    </form>
  );
}
