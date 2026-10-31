"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AccessibilityKey, IntakeData, MatchResult, Specialty, SpecialtySuggestion, TextSource } from "@/lib/types";
import { ACCESSIBILITY_KEYS, SPECIALTIES } from "@/lib/types";
import { loadIntakeDraft, saveSession } from "@/lib/session";
import { matchSpecialty, normalizeId, parseDays } from "@/lib/voice";
import SuggestionCard from "./SuggestionCard";
import { useI18n } from "./I18nProvider";
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

const HAS_HELP = new Set<FieldKey>(["insurancePayer", "memberId", "urgencyWindowDays", "reasonForVisit"]);

/** Returns the fields that are invalid; the message comes from the dictionary. */
function validate(f: Form): Partial<Record<FieldKey, true>> {
  const e: Partial<Record<FieldKey, true>> = {};
  if (!f.patientName.trim()) e.patientName = true;
  if (!f.insurancePayer.trim()) e.insurancePayer = true;
  if (!f.memberId.trim()) e.memberId = true;
  if (!f.specialty) e.specialty = true;
  if (!f.reasonForVisit.trim()) e.reasonForVisit = true;
  const d = Number(f.urgencyWindowDays);
  if (!Number.isInteger(d) || d < 1 || d > 365) e.urgencyWindowDays = true;
  return e;
}

export default function IntakeForm() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const LABELS = t.form.labels;
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, true>>>({});
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
      setSuggestError(t.suggest.needText);
      document.getElementById("reasonForVisit")?.focus();
      return;
    }
    setSuggesting(true);
    setStatus(t.suggest.status);
    try {
      const res = await fetch("/api/suggest-specialty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: text, lang }),
      });
      const json = (await res.json()) as { suggestion?: SpecialtySuggestion; source?: TextSource; errors?: string[] };
      if (!res.ok || !json.suggestion) throw new Error(json.errors?.join(" ") || t.suggest.failed);
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
    setStatus(t.form.selected(t.specialties[sp]));
  }

  function toggleNeed(key: AccessibilityKey) {
    update("accessibilityRequirements", { ...form.accessibilityRequirements, [key]: !form.accessibilityRequirements[key] });
  }

  function fillSample() {
    setForm(SAMPLE);
    setErrors({});
    setStatus(t.form.sampleFilled);
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
    setStatus(t.form.submitting);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...intake, lang }),
      });
      const json = (await res.json()) as { results?: MatchResult[]; errors?: string[] };
      if (!res.ok || !json.results) throw new Error(json.errors?.join(" ") || t.form.somethingWrong);
      saveSession({ intake, results: json.results });
      setStatus(t.form.found(json.results.length));
      router.push("/results");
    } catch (err) {
      setLoading(false);
      setStatus("");
      setServerError((err as Error).message || t.form.networkError);
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
        {t.form.errors[k]}
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
                <h2>{t.form.serverErrorHeading}</h2>
                <p style={{ margin: 0 }}>{serverError}</p>
              </>
            ) : (
              <>
<h2>{t.form.errorsHeading(errorKeys.length)}</h2>
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
                        {LABELS[k]}: {t.form.errors[k]}
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
          <span className="panel__step" aria-hidden>01</span>{t.form.s1Title}
        </legend>
        <p className="panel__hint">{t.form.s1Hint}</p>
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
            <VoiceInput fieldLabel={t.form.mic.patientName} targetId="patientName" onTranscript={(t) => update("patientName", titleCase(t))} />
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
                placeholder={t.form.insurancePlaceholder}
                value={form.insurancePayer}
                onChange={(e) => update("insurancePayer", e.target.value)}
              />
              <VoiceInput
                fieldLabel={t.form.mic.insurancePayer}
                targetId="insurancePayer"
                onTranscript={(t) => update("insurancePayer", titleCase(t))}
              />
            </div>
            <span className="field__help" id="insurancePayer-help">{t.form.help.insurancePayer}</span>
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
              <VoiceInput fieldLabel={t.form.mic.memberId} targetId="memberId" onTranscript={(t) => update("memberId", normalizeId(t))} />
            </div>
            <span className="field__help" id="memberId-help">{t.form.help.memberId}</span>
            <FieldError k="memberId" />
          </div>
        </div>
      </fieldset>

      <fieldset className="panel" data-reveal style={{ ["--i" as string]: 2 }}>
        <legend className="panel__legend">
          <span className="panel__step" aria-hidden>02</span>{t.form.s2Title}
        </legend>
        <p className="panel__hint">{t.form.s2Hint}</p>
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
              fieldLabel={t.form.mic.reasonForVisit}
              targetId="reasonForVisit"
              continuous
              onStart={() => {
                dictationBase.current = form.reasonForVisit;
              }}
              onTranscript={(t) => update("reasonForVisit", appendDictation(dictationBase.current, t))}
            />
          </div>
          <span className="field__help" id="reasonForVisit-help">{t.form.help.reasonForVisit}</span>
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
                {t.suggest.thinking}
              </>
            ) : (
              <>
                <Compass />
                {suggestion ? t.suggest.again : t.suggest.button}
              </>
            )}
          </button>
          <span className="field__help" id="suggest-note">{t.suggest.note}</span>
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
                  {t.form.chooseOne}
                </option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {t.specialties[s]}
                  </option>
                ))}
              </select>
              <VoiceInput
                fieldLabel={t.form.mic.specialty}
                targetId="specialty"
                onTranscript={(spoken, isFinal) => {
                  if (!isFinal) return;
                  const sp = matchSpecialty(spoken, t.specialties);
                  if (sp) chooseSpecialty(sp);
                  else setStatus(t.form.voiceNoSpecialty(spoken));
                }}
              />
            </div>
            <FieldError k="specialty" />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="urgencyWindowDays">{LABELS.urgencyWindowDays}</label>
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
                fieldLabel={t.form.mic.urgencyWindowDays}
                targetId="urgencyWindowDays"
                onTranscript={(spoken, isFinal) => {
                  if (!isFinal) return;
                  const d = parseDays(spoken);
                  if (d !== null) update("urgencyWindowDays", String(d));
                  else setStatus(t.form.voiceNoNumber(spoken));
                }}
              />
            </div>
            <span className="field__help" id="urgencyWindowDays-help">{t.form.help.urgencyWindowDays}</span>
            <FieldError k="urgencyWindowDays" />
          </div>
        </div>
      </fieldset>

      <fieldset className="panel" data-reveal style={{ ["--i" as string]: 0 }}>
        <legend className="panel__legend">
          <span className="panel__step" aria-hidden>03</span>{t.form.s3Title}
        </legend>
        <p className="panel__hint">{t.form.s3Hint}</p>
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
                <span className="choice__title">{t.access.short[k]}</span>
                <span className="choice__desc">{t.access.desc[k]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="panel" data-reveal style={{ ["--i" as string]: 0 }}>
        <legend className="panel__legend">
          <span className="panel__step" aria-hidden>04</span>{t.form.s4Title}
        </legend>
        <p className="panel__hint">{t.form.s4Hint}</p>
        <div className="choices choices--2">
          {(
            [
              ["auto_book_preferred", t.form.autoTitle, t.form.autoDesc],
              ["call_prep_only", t.form.callTitle, t.form.callDesc],
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
              {t.form.submitting}
            </>
          ) : (
            <>
              <Check size={16} />
              {t.form.submit}
            </>
          )}
        </button>
        <button type="button" className="btn btn--secondary btn--lg" onClick={fillSample} disabled={loading}>
          {t.form.sample}
        </button>
      </div>
    </form>
  );
}
