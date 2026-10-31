import { generateStructured } from "./ai-client";
import type { SpecialtySuggestion, TextSource } from "./types";
import { SPECIALTIES } from "./types";

// "Which specialist should I see?" — navigation help, not diagnosis.
// The model reasons over the whole description (negation, duration, age, context),
// which a keyword list can't. Without AI we don't guess: we send people to primary care.

const SCOPES: Record<(typeof SPECIALTIES)[number], string> = {
  Neurology: "brain, spinal cord and nerves: headaches/migraines, numbness, tingling, weakness, seizures, tremor, memory or coordination problems",
  Cardiology: "heart and blood vessels: palpitations, high blood pressure, exertional chest discomfort, fainting with a possible heart cause, leg swelling from heart issues",
  Dermatology: "skin, hair and nails: rashes, moles or spots that change, acne, eczema, psoriasis, hair loss",
  Orthopedics: "bones, joints, muscles, tendons and ligaments: injuries, possible fractures, joint pain or instability, structural back or neck problems",
  Psychiatry: "mental health: low mood, anxiety, panic, trauma, mood swings, psychosis, mental-health medication",
  "Primary Care": "a general physician: first stop for new, vague or whole-body symptoms, several unrelated symptoms, infections, routine care and referrals",
  "OB/GYN": "pregnancy, periods, contraception, pelvic and reproductive health",
  Pediatrics: "anyone under 18: the first stop for a child's health concern",
  ENT: "ears, nose, throat and sinuses: hearing loss, ear pain, tinnitus, sinus problems, voice or swallowing trouble, inner-ear dizziness",
  "Physical Therapy": "rehabilitation: recovering movement and strength after injury or surgery, or managing ongoing pain once a doctor has assessed it",
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    specialty: { type: "string", enum: [...SPECIALTIES] },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    reasoning: { type: "string" },
    alternatives: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          specialty: { type: "string", enum: [...SPECIALTIES] },
          reason: { type: "string" },
        },
        required: ["specialty", "reason"],
      },
    },
    urgency: { type: "string", enum: ["emergency", "urgent", "routine"] },
    urgencyNote: { type: "string" },
  },
  required: ["specialty", "confidence", "reasoning", "alternatives", "urgency", "urgencyNote"],
};

const SYSTEM = `You help patients choose which kind of clinic to book. You are a navigation aid, not a clinician.

Choose exactly one specialty from this list, the best FIRST place to book for what the person describes:
${SPECIALTIES.map((s) => `- ${s}: ${SCOPES[s]}`).join("\n")}

How to decide:
- Read the whole description. Respect negations ("no chest pain"), duration, age, pregnancy, injuries, existing diagnoses and what they've already tried.
- Under 18, or describing their child: Pediatrics. Pregnant, or the concern is reproductive: OB/GYN.
- Vague, whole-body, several unrelated systems, or not enough detail: Primary Care with low confidence. Say what detail would help.
- Physical Therapy only for rehab or known conditions, not for undiagnosed new pain.
- Offer up to 2 genuinely plausible alternatives (none if there aren't any). Never repeat the main pick.

Safety:
- urgency "emergency" for anything that could be life- or limb-threatening right now (for example chest pain or pressure, trouble breathing, stroke signs, sudden severe headache, heavy bleeding, thoughts of self-harm). urgencyNote then tells them to call 911 or go to an emergency room now.
- urgency "urgent" when they should be seen within a day or two; "routine" otherwise.

Writing:
- reasoning: 2-3 short, plain sentences to the person ("you"), explaining which part of the body or kind of care it points to and why. Do not diagnose or name a specific disease as what they have. No markdown.
- urgencyNote: one plain sentence.

Reply with only a JSON object with keys: specialty, confidence, reasoning, alternatives (array of {specialty, reason}), urgency, urgencyNote.`;

// Only used when no AI is available, as a safety net for the most serious signs.
const RED_FLAGS =
  /chest (pain|pressure|tightness)|can'?t breathe|(trouble|difficulty) breathing|face (is )?droop|slurred speech|sudden (weakness|numbness|confusion|severe headache)|worst headache|suicid|kill myself|end my life|overdose|seizure|unconscious|severe bleeding|coughing (up )?blood/i;

function isSpecialty(x: unknown): x is SpecialtySuggestion["specialty"] {
  return typeof x === "string" && (SPECIALTIES as readonly string[]).includes(x);
}

export function parseSuggestion(raw: unknown): SpecialtySuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isSpecialty(r.specialty)) return null;
  if (!["low", "medium", "high"].includes(r.confidence as string)) return null;
  if (!["emergency", "urgent", "routine"].includes(r.urgency as string)) return null;
  if (typeof r.reasoning !== "string" || !r.reasoning.trim()) return null;
  const alternatives = (Array.isArray(r.alternatives) ? r.alternatives : [])
    .filter((a): a is { specialty: string; reason: string } => isSpecialty(a?.specialty) && typeof a?.reason === "string")
    .filter((a) => a.specialty !== r.specialty)
    .slice(0, 2) as SpecialtySuggestion["alternatives"];
  return {
    specialty: r.specialty,
    confidence: r.confidence as SpecialtySuggestion["confidence"],
    reasoning: r.reasoning.trim(),
    alternatives,
    urgency: r.urgency as SpecialtySuggestion["urgency"],
    urgencyNote: typeof r.urgencyNote === "string" ? r.urgencyNote.trim() : "",
  };
}

function fallback(symptoms: string): SpecialtySuggestion {
  const emergency = RED_FLAGS.test(symptoms);
  return {
    specialty: "Primary Care",
    confidence: "low",
    reasoning:
      "Our AI helper isn't available right now, so we can't read your description closely enough to point you to a specialist. A general physician is the right first stop: they can assess everything together and refer you on if needed.",
    alternatives: [],
    urgency: emergency ? "emergency" : "routine",
    urgencyNote: emergency
      ? "Some of what you wrote can be a sign of an emergency. Call 911 or go to the nearest emergency room now."
      : "",
  };
}

export function suggestSpecialty(symptoms: string): Promise<{ value: SpecialtySuggestion; source: TextSource }> {
  return generateStructured(
    { system: SYSTEM, user: `What the person wrote:\n"""${symptoms}"""`, maxTokens: 4000, effort: "medium", schema: SCHEMA },
    parseSuggestion,
    () => fallback(symptoms),
  );
}
