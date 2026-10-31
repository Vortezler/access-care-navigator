import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import Anthropic from "@anthropic-ai/sdk";
import type { AccessibilityRequirements, Clinic, IntakeData, Specialty, TextSource } from "./types";
import { getDict, type Dict } from "./i18n";
import { ACCESSIBILITY_KEYS, ACCESSIBILITY_LABELS } from "./types";

// Three-tier chain: Bedrock -> Anthropic API -> hand-written template.
// The template tier means the demo never breaks, even with no keys at all.

const TIMEOUT_MS = 20_000;
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || "us.anthropic.claude-opus-5-5";
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
  // AWS_BEARER_TOKEN_BEDROCK is the newer Bedrock API-key (bearer token) flow;
  // the SDK itself auto-detects it, this just needs to also trigger the attempt.
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE || process.env.AWS_BEARER_TOKEN_BEDROCK,
  );
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

// ---------------------------------------------------------------------------
// Raw multi-turn calls for the Care Guide's tool loop. Content blocks (including
// thinking and tool_use blocks) are passed back unchanged within a loop.

export type Provider = "bedrock" | "anthropic";

export interface RawBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  [k: string]: unknown;
}

export interface RawMessage {
  content: RawBlock[];
  stop_reason: string | null;
}

export interface RawRequest {
  system: string;
  messages: unknown[];
  tools: unknown[];
  maxTokens: number;
  effort: "low" | "medium" | "high";
  timeoutMs: number;
}

export function availableProviders(): Provider[] {
  const out: Provider[] = [];
  if (bedrockConfigured()) out.push("bedrock");
  if (process.env.ANTHROPIC_API_KEY) out.push("anthropic");
  return out;
}

export async function callRaw(provider: Provider, r: RawRequest): Promise<RawMessage> {
  if (provider === "bedrock") {
    bedrock ??= new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });
    const res = await bedrock.send(
      new InvokeModelCommand({
        modelId: BEDROCK_MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: r.maxTokens,
          system: r.system,
          messages: r.messages,
          tools: r.tools,
        }),
      }),
      { abortSignal: AbortSignal.timeout(r.timeoutMs) },
    );
    const body = JSON.parse(new TextDecoder().decode(res.body)) as Partial<RawMessage>;
    return { content: body.content ?? [], stop_reason: body.stop_reason ?? null };
  }
  anthropic ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
  const res = await anthropic.messages.create(
    {
      model: ANTHROPIC_MODEL,
      max_tokens: r.maxTokens,
      output_config: { effort: r.effort },
      system: r.system,
      messages: r.messages as Anthropic.MessageParam[],
      tools: r.tools as Anthropic.Tool[],
    },
    { timeout: r.timeoutMs },
  );
  return { content: res.content as unknown as RawBlock[], stop_reason: res.stop_reason };
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

/** Tells the model which language to write in (the site's selected language). */
export function languageRule(d: Dict): string {
  return `Write everything in ${d.tpl.languageName}. Keep clinic names, addresses and phone numbers exactly as given.`;
}

function listNeeds(req: AccessibilityRequirements, labels: Record<string, string> = ACCESSIBILITY_LABELS): string[] {
  return ACCESSIBILITY_KEYS.filter((k) => req[k]).map((k) => labels[k]);
}

function describeAccessibility(req: AccessibilityRequirements, clinic: Clinic, labels: Record<string, string> = ACCESSIBILITY_LABELS) {
  const wanted = ACCESSIBILITY_KEYS.filter((k) => req[k]);
  return {
    met: wanted.filter((k) => clinic.accessibility[k]).map((k) => labels[k]),
    unmet: wanted.filter((k) => !clinic.accessibility[k]).map((k) => labels[k]),
  };
}

export interface ExplanationInput {
  clinic: Clinic;
  requirements: AccessibilityRequirements;
  inNetwork: boolean;
  slotsInWindow: number;
  urgencyWindowDays: number;
}

export function templateExplanation(i: ExplanationInput, d: Dict = getDict("en")): string {
  const { met, unmet } = describeAccessibility(i.requirements, i.clinic, d.access.labels);
  const total = met.length + unmet.length;
  const access = total === 0 ? d.tpl.noNeeds : d.tpl.meets(met.length, total, unmet.join(", ").toLowerCase());
  const network = i.inNetwork ? d.tpl.inNetwork : d.tpl.outNetwork;
  const timing =
    i.slotsInWindow > 0 ? d.tpl.openings(i.slotsInWindow, i.urgencyWindowDays) : d.tpl.noOpenings(i.urgencyWindowDays);
  // Languages that end sentences with full-width punctuation (Chinese) don't put spaces between them
  return [access, network, timing].reduce((out, part) => (/[。！？]$/.test(out) ? out + part : `${out} ${part}`));
}

export function generateMatchExplanation(i: ExplanationInput, d: Dict = getDict("en")): Promise<GeneratedText> {
  const { met, unmet } = describeAccessibility(i.requirements, i.clinic);
  return generate(
    {
      maxTokens: 2000,
      system:
        "You help disabled patients judge whether a clinic fits their needs. Write 1-2 plain-language sentences " +
        "(under 50 words), warm but factual. Mention accessibility fit first, then insurance, then timing. " +
        "Use only the facts given; never invent details. No markdown, no greeting. " +
        languageRule(d),
      user: [
        `Clinic: ${i.clinic.name} (${i.clinic.specialty})`,
        `Accessibility needs met: ${met.join("; ") || "none requested"}`,
        `Accessibility needs NOT met: ${unmet.join("; ") || "none"}`,
        `In-network with patient's insurance: ${i.inNetwork ? "yes" : "no / unverified"}`,
        `Open appointments within the patient's ${i.urgencyWindowDays}-day window: ${i.slotsInWindow}`,
        `Online booking available: ${i.clinic.hasOnlineBooking ? "yes" : "no, must call"}`,
      ].join("\n"),
    },
    () => templateExplanation(i, d),
  );
}

export function templateScript(clinic: Clinic, intake: IntakeData, d: Dict = getDict("en")): string {
  return d.tpl.script({
    name: intake.patientName,
    specialty: d.specialties[intake.specialty as Specialty] ?? intake.specialty,
    reason: intake.reasonForVisit,
    insurance: intake.insurancePayer,
    memberId: intake.memberId,
    needs: listNeeds(intake.accessibilityRequirements, d.access.labels),
    days: intake.urgencyWindowDays,
  });
}

export function generateAdvocacyScript(clinic: Clinic, intake: IntakeData, d: Dict = getDict("en")): Promise<GeneratedText> {
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
        "Plain text only: no markdown, no headings, no stage directions. Use short paragraphs and '  • ' bullets for the accessibility questions. Under 250 words. " +
        languageRule(d),
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
    () => templateScript(clinic, intake, d),
  );
}

// ---------------------------------------------------------------------------
// Email / text-message drafts to a clinic's front desk

export type Channel = "email" | "sms";

export interface ClinicMessage {
  subject: string; // empty for text messages
  body: string;
}

export function templateMessage(clinic: Clinic, intake: IntakeData, channel: Channel, d: Dict = getDict("en")): ClinicMessage {
  const args = {
    clinic: clinic.name,
    name: intake.patientName,
    specialty: d.specialties[intake.specialty as Specialty] ?? intake.specialty,
    reason: intake.reasonForVisit,
    insurance: intake.insurancePayer,
    memberId: intake.memberId,
    needs: listNeeds(intake.accessibilityRequirements, d.access.labels),
    days: intake.urgencyWindowDays,
  };
  return channel === "email"
    ? { subject: d.tpl.emailSubject(intake.patientName), body: d.tpl.email(args) }
    : { subject: "", body: d.tpl.sms(args) };
}

const MESSAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { subject: { type: "string" }, body: { type: "string" } },
  required: ["subject", "body"],
};

function parseMessage(raw: unknown): ClinicMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.body !== "string" || r.body.trim().length < 20) return null;
  return { subject: typeof r.subject === "string" ? r.subject.trim() : "", body: r.body.trim() };
}

export function generateClinicMessage(
  clinic: Clinic,
  intake: IntakeData,
  channel: Channel,
  d: Dict = getDict("en"),
): Promise<{ value: ClinicMessage; source: TextSource }> {
  const needs = listNeeds(intake.accessibilityRequirements);
  const shape =
    channel === "email"
      ? "an email. Give it a clear subject line and a body under 200 words, signed with their name. Put each accessibility need on its own line starting with '- ' and ask the clinic to confirm it."
      : "a text message (SMS). subject must be an empty string. The body must be under 320 characters: who they are, what they want booked and by when, the accessibility needs in one sentence, their insurance, and a request to text or call back with times.";
  return generateStructured(
    {
      maxTokens: 3000,
      effort: "low",
      schema: MESSAGE_SCHEMA,
      system:
        `You draft ${shape} It is from a disabled patient to a clinic's front desk, asking to book a new-patient appointment. ` +
        "First person, polite and confident, never apologetic about accommodations. Include the reason for the visit in brief, " +
        "the insurance (and member ID in an email), and the time window. Use only the facts given; never invent details. " +
        "Plain text, no markdown except '- ' bullets. " +
        languageRule(d) +
        ' Reply with only a JSON object: {"subject": string, "body": string}.',
      user: [
        `Patient name: ${intake.patientName}`,
        `Clinic: ${clinic.name}`,
        `Specialty: ${intake.specialty}`,
        `Reason for visit (patient's words): ${intake.reasonForVisit}`,
        `Insurance: ${intake.insurancePayer}, member ID ${intake.memberId}`,
        `Accessibility needs: ${needs.join("; ") || "none specified (ask what accommodations they offer)"}`,
        `Wants to be seen within: ${intake.urgencyWindowDays} days`,
      ].join("\n"),
    },
    parseMessage,
    () => templateMessage(clinic, intake, channel, d),
  );
}
