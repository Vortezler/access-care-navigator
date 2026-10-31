import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import Anthropic from "@anthropic-ai/sdk";
import type { AccessibilityRequirements, Clinic, IntakeData, TextSource } from "./types";
import { ACCESSIBILITY_KEYS, ACCESSIBILITY_LABELS } from "./types";

// Three-tier chain: Bedrock -> Anthropic API -> hand-written template.
// The template tier means the demo never breaks, even with no keys at all.

const TIMEOUT_MS = 20_000;
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || "anthropic.claude-opus-5-5";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export interface Prompt {
  system: string;
  user: string;
  maxTokens: number;
  effort?: "low" | "medium" | "high";
  /** JSON Schema: the Anthropic API enforces it; on Bedrock the prompt asks for it and we validate. */
  schema?: Record<string, unknown>;
}

export interface GeneratedText {
  text: string;
  source: TextSource;
}

let bedrock: BedrockRuntimeClient | null = null;
let anthropic: Anthropic | null = null;

function bedrockConfigured(): boolean {
  // Without explicit creds the AWS SDK walks its whole provider chain (incl. IMDS),
  // which is slow on a laptop. Only try Bedrock when the user set something up.
  return Boolean(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE);
}

async function callBedrock(p: Prompt): Promise<string> {
  bedrock ??= new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });
  const res = await bedrock.send(
    new InvokeModelCommand({
      modelId: BEDROCK_MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: p.maxTokens,
        system: p.system,
        messages: [{ role: "user", content: p.user }],
      }),
    }),
    { abortSignal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  const body = JSON.parse(new TextDecoder().decode(res.body)) as {
    stop_reason?: string;
    content?: { type: string; text?: string }[];
  };
  if (body.stop_reason === "refusal") throw new Error("Bedrock: model declined");
  return extractText(body.content ?? []);
}

async function callAnthropic(p: Prompt): Promise<string> {
  anthropic ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
  const res = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: p.maxTokens,
    output_config: {
      effort: p.effort ?? "low",
      ...(p.schema ? { format: { type: "json_schema" as const, schema: p.schema } } : {}),
    },
    system: p.system,
    messages: [{ role: "user", content: p.user }],
  });
  if (res.stop_reason === "refusal") throw new Error("Anthropic: model declined");
  return extractText(res.content);
}

function extractText(blocks: { type: string; text?: string }[]): string {
  const text = blocks
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("Empty model response");
  return text;
}

async function generate(p: Prompt, template: () => string): Promise<GeneratedText> {
  if (bedrockConfigured()) {
    try {
      return { text: await callBedrock(p), source: "bedrock" };
    } catch (err) {
      console.warn("[ai-client] Bedrock failed, falling back:", (err as Error).message);
    }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return { text: await callAnthropic(p), source: "anthropic" };
    } catch (err) {
      console.warn("[ai-client] Anthropic API failed, falling back:", (err as Error).message);
    }
  }
  return { text: template(), source: "template" };
}

/**
 * Like generate(), but for JSON answers. Model output that doesn't parse or doesn't
 * pass `parse` is treated as a failure and the fallback is used — never half-trusted.
 */
export async function generateStructured<T>(
  p: Prompt,
  parse: (raw: unknown) => T | null,
  fallback: () => T,
): Promise<{ value: T; source: TextSource }> {
  const r = await generate(p, () => "");
  if (r.source !== "template") {
    const value = parse(extractJson(r.text));
    if (value) return { value, source: r.source };
    console.warn("[ai-client] Model output didn't match the expected shape; using fallback.");
  }
  return { value: fallback(), source: "template" };
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/); // tolerate prose or code fences around the object
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

// ---------------------------------------------------------------------------

function listNeeds(req: AccessibilityRequirements): string[] {
  return ACCESSIBILITY_KEYS.filter((k) => req[k]).map((k) => ACCESSIBILITY_LABELS[k]);
}

function describeAccessibility(req: AccessibilityRequirements, clinic: Clinic) {
  const wanted = ACCESSIBILITY_KEYS.filter((k) => req[k]);
  return {
    met: wanted.filter((k) => clinic.accessibility[k]).map((k) => ACCESSIBILITY_LABELS[k]),
    unmet: wanted.filter((k) => !clinic.accessibility[k]).map((k) => ACCESSIBILITY_LABELS[k]),
  };
}

export interface ExplanationInput {
  clinic: Clinic;
  requirements: AccessibilityRequirements;
  inNetwork: boolean;
  slotsInWindow: number;
  urgencyWindowDays: number;
}

export function templateExplanation(i: ExplanationInput): string {
  const { met, unmet } = describeAccessibility(i.requirements, i.clinic);
  const total = met.length + unmet.length;
  const access =
    total === 0
      ? "You didn't select any accessibility requirements."
      : `Meets ${met.length} of ${total} of your accessibility requirements${unmet.length ? ` (missing: ${unmet.join(", ").toLowerCase()})` : ""}.`;
  const network = i.inNetwork
    ? "In-network with your insurance."
    : "May be out-of-network — verify before booking.";
  const timing =
    i.slotsInWindow > 0
      ? `${i.slotsInWindow} opening${i.slotsInWindow === 1 ? "" : "s"} within your ${i.urgencyWindowDays}-day window.`
      : `No listed openings within your ${i.urgencyWindowDays}-day window.`;
  return `${access} ${network} ${timing}`;
}

export function generateMatchExplanation(i: ExplanationInput): Promise<GeneratedText> {
  const { met, unmet } = describeAccessibility(i.requirements, i.clinic);
  return generate(
    {
      maxTokens: 2000,
      system:
        "You help disabled patients judge whether a clinic fits their needs. Write 1-2 plain-language sentences " +
        "(under 50 words), warm but factual. Mention accessibility fit first, then insurance, then timing. " +
        "Use only the facts given; never invent details. No markdown, no greeting.",
      user: [
        `Clinic: ${i.clinic.name} (${i.clinic.specialty})`,
        `Accessibility needs met: ${met.join("; ") || "none requested"}`,
        `Accessibility needs NOT met: ${unmet.join("; ") || "none"}`,
        `In-network with patient's insurance: ${i.inNetwork ? "yes" : "no / unverified"}`,
        `Open appointments within the patient's ${i.urgencyWindowDays}-day window: ${i.slotsInWindow}`,
        `Online booking available: ${i.clinic.hasOnlineBooking ? "yes" : "no, must call"}`,
      ].join("\n"),
    },
    () => templateExplanation(i),
  );
}

export function templateScript(clinic: Clinic, intake: IntakeData): string {
  const needs = listNeeds(intake.accessibilityRequirements);
  const needLines = needs.length
    ? needs.map((n) => `  • Can you confirm you have: ${n.toLowerCase()}?`).join("\n")
    : "  • I don't have specific accessibility requests, but I'd like to know what accommodations you offer.";
  return `Hi, my name is ${intake.patientName}. I'm calling to schedule a new-patient ${intake.specialty.toLowerCase()} appointment.

The reason for my visit: ${intake.reasonForVisit}

My insurance is ${intake.insurancePayer}, member ID ${intake.memberId}. Could you confirm you're in-network with that plan?

I have a disability, and I want to make sure the visit will be accessible before I book. Before we pick a time:
${needLines}

If any of these aren't available, could you tell me what you can arrange instead, or note the request in my chart so it's ready when I arrive?

I'm hoping to be seen within the next ${intake.urgencyWindowDays} days. What's the earliest appointment you have?

Before we hang up, could you please repeat back the date, time, and the accommodations you've noted, and give me a confirmation number?

Thank you so much for your help.`;
}

export function generateAdvocacyScript(clinic: Clinic, intake: IntakeData): Promise<GeneratedText> {
  const needs = listNeeds(intake.accessibilityRequirements);
  return generate(
    {
      maxTokens: 4000,
      system:
        "You write first-person phone scripts that disabled patients read aloud, word for word, when calling a clinic to book. " +
        "Tone: polite, confident, self-advocating, never apologetic about needing accommodations. " +
        "Structure: greeting with name and purpose; reason for visit; insurance check; each accessibility need as its own clear yes/no question, " +
        "with a follow-up asking what they can arrange if the answer is no; ask for the earliest slot within the time window; " +
        "ask them to repeat back the booking and noted accommodations and give a confirmation number; thank them. " +
        "Plain text only: no markdown, no headings, no stage directions. Use short paragraphs and '  • ' bullets for the accessibility questions. Under 250 words.",
      user: [
        `Patient name: ${intake.patientName}`,
        `Clinic: ${clinic.name}, phone ${clinic.phone}`,
        `Specialty: ${intake.specialty}`,
        `Reason for visit (patient's words): ${intake.reasonForVisit}`,
        `Insurance: ${intake.insurancePayer}, member ID ${intake.memberId}`,
        `Accessibility needs: ${needs.join("; ") || "none specified — ask what accommodations they offer"}`,
        `Wants to be seen within: ${intake.urgencyWindowDays} days`,
      ].join("\n"),
    },
    () => templateScript(clinic, intake),
  );
}
