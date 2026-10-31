// The Care Guide: a Claude tool-use loop that can read PDFs, search the clinic
// directory, simulate bookings, write call scripts and propose calendar events.
// Server-side only. The conversation itself lives in the browser and is sent each turn.

import type { AccessibilityKey, IntakeData, Specialty } from "./types";
import { ACCESSIBILITY_KEYS, SPECIALTIES } from "./types";
import { getClinicById, getClinics } from "./clinics";
import { scoreClinics } from "./matching";
import { confirmationNumber } from "./booking";
import { type Provider, type RawBlock, availableProviders, callRaw, languageRule } from "./ai-client";
import type { Dict } from "./i18n";

// ---------- Wire types (shared with the client) ----------

export interface ChatDoc {
  name: string;
  data: string; // base64 PDF
}

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  docs?: ChatDoc[];
  /** Compact notes of tool results from that assistant turn, fed back so later turns keep context */
  memory?: string;
}

export interface ClinicSummary {
  id: string;
  name: string;
  address: string;
  phone: string;
  score: number;
  inNetwork: boolean;
  needsMet: number;
  needsTotal: number;
  online: boolean;
}

export interface CalEventData {
  title: string;
  description: string;
  location?: string;
  start: string; // ISO
  end: string; // ISO
}

export type ChatAction =
  | { type: "clinics"; clinics: ClinicSummary[] }
  | {
      type: "booking";
      clinicId: string;
      slot: string;
      confirmation: string;
      specialty: Specialty;
      reason?: string;
      needs: AccessibilityKey[];
    }
  | { type: "calendar"; event: CalEventData }
  | { type: "script"; clinicId: string; script: string };

export interface ChatReply {
  reply: string;
  actions: ChatAction[];
  memory: string;
  source: "bedrock" | "anthropic" | "template";
}

export interface ChatContext {
  d: Dict;
  locale: string; // e.g. "es-US", for slot labels
  timeZone: string;
  profile: Partial<IntakeData> | null;
}

// ---------- Tools ----------

const TOOLS = [
  {
    name: "find_clinics",
    description:
      "Search the clinic directory for one specialty. Returns clinics ranked by fit (insurance network + accessibility needs met), " +
      "each with id, address, phone, which needs are missing, whether online booking is possible, and open appointment slots " +
      "(ISO time plus a label in the person's time zone). Call this before recommending any clinic.",
    input_schema: {
      type: "object",
      properties: {
        specialty: { type: "string", enum: [...SPECIALTIES] },
        insurance: { type: "string", description: "Insurance company name, if known" },
        accessibility_needs: { type: "array", items: { type: "string", enum: ACCESSIBILITY_KEYS } },
        within_days: { type: "integer", minimum: 1, maximum: 365, description: "How soon they need to be seen" },
      },
      required: ["specialty"],
    },
  },
  {
    name: "book_appointment",
    description:
      "Book (simulate) an appointment at a clinic that has online booking, for one of the open slots find_clinics returned. " +
      "Only call after the person has clearly confirmed the clinic and time. Returns a confirmation number and shows the person a booking card.",
    input_schema: {
      type: "object",
      properties: {
        clinic_id: { type: "string" },
        slot_iso: { type: "string", description: "Exactly one of the slot ISO times from find_clinics" },
        patient_name: { type: "string" },
        reason: { type: "string", description: "Short reason for visit, in the person's words" },
        accessibility_needs: { type: "array", items: { type: "string", enum: ACCESSIBILITY_KEYS } },
      },
      required: ["clinic_id", "slot_iso", "patient_name"],
    },
  },
  {
    name: "show_call_script",
    description:
      "Show the person a first-person phone script for booking at a phone-only clinic, with copy, listen and remind-me-to-call buttons. " +
      "Write the script yourself in the person's language: name and purpose, reason, insurance check, each accessibility need as a clear yes/no question, " +
      "earliest slot in their window, ask for a read-back and confirmation number, thanks. Plain text, under 220 words.",
    input_schema: {
      type: "object",
      properties: {
        clinic_id: { type: "string" },
        script: { type: "string" },
      },
      required: ["clinic_id", "script"],
    },
  },
  {
    name: "add_to_calendar",
    description:
      "Offer a calendar event to the person (an appointment, a reminder to call, a follow-up). Shows a card with " +
      "'Add to Google Calendar' and '.ics' buttons; the person presses one to save it. Use after they agree. " +
      "Not needed for appointments booked with book_appointment (their card already has these buttons) or call scripts (which have a reminder button).",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        start_iso: { type: "string", description: "ISO 8601 start time with offset or Z" },
        duration_minutes: { type: "integer", minimum: 5, maximum: 480 },
        location: { type: "string" },
        description: { type: "string" },
      },
      required: ["title", "start_iso"],
    },
  },
];

const isNeed = (x: unknown): x is AccessibilityKey => typeof x === "string" && (ACCESSIBILITY_KEYS as string[]).includes(x);
const isSpecialty = (x: unknown): x is Specialty => typeof x === "string" && (SPECIALTIES as readonly string[]).includes(x);

interface ToolOutcome {
  content: string;
  isError?: boolean;
  action?: ChatAction;
  note?: string;
}

function runTool(name: string, raw: unknown, ctx: ChatContext): ToolOutcome {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const label = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(ctx.locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: ctx.timeZone,
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  switch (name) {
    case "find_clinics": {
      if (!isSpecialty(input.specialty)) return { content: `Unknown specialty. Use one of: ${SPECIALTIES.join(", ")}`, isError: true };
      const needs = Array.isArray(input.accessibility_needs) ? input.accessibility_needs.filter(isNeed) : [];
      const days = Number.isInteger(input.within_days) ? (input.within_days as number) : 30;
      const intake: IntakeData = {
        patientName: "",
        insurancePayer: typeof input.insurance === "string" ? input.insurance : "",
        memberId: "",
        specialty: input.specialty,
        reasonForVisit: "",
        urgencyWindowDays: days,
        accessibilityRequirements: Object.fromEntries(
          ACCESSIBILITY_KEYS.map((k) => [k, needs.includes(k)]),
        ) as unknown as IntakeData["accessibilityRequirements"],
        autonomyMode: "auto_book_preferred",
      };
      const scored = scoreClinics(intake, getClinics()).slice(0, 5);
      const now = Date.now();
      const forModel = scored.map((s) => ({
        clinic_id: s.clinic.id,
        name: s.clinic.name,
        address: s.clinic.address,
        phone: s.clinic.phone,
        score: s.score,
        in_network: intake.insurancePayer ? s.inNetwork : "unknown (no insurance given)",
        needs_met: `${s.requirementsMetCount}/${s.requirementsTotalCount}`,
        missing_needs: ACCESSIBILITY_KEYS.filter((k) => needs.includes(k) && !s.clinic.accessibility[k]),
        online_booking: s.clinic.hasOnlineBooking,
        open_slots: s.clinic.openSlots.filter((x) => Date.parse(x) > now).map((iso) => ({ iso, label: label(iso) })),
      }));
      return {
        content: JSON.stringify(forModel),
        action: {
          type: "clinics",
          clinics: scored.map((s) => ({
            id: s.clinic.id,
            name: s.clinic.name,
            address: s.clinic.address,
            phone: s.clinic.phone,
            score: s.score,
            inNetwork: s.inNetwork,
            needsMet: s.requirementsMetCount,
            needsTotal: s.requirementsTotalCount,
            online: s.clinic.hasOnlineBooking,
          })),
        },
        note: `find_clinics(${input.specialty}): ${forModel
          .map((c) => `${c.clinic_id} "${c.name}" ${c.online_booking ? "online" : "phone-only"} slots=[${c.open_slots.map((x) => x.iso).join(",")}]`)
          .join("; ")}`,
      };
    }

    case "book_appointment": {
      const clinic = typeof input.clinic_id === "string" ? getClinicById(input.clinic_id) : undefined;
      if (!clinic) return { content: "No clinic with that id. Use an id from find_clinics.", isError: true };
      if (!clinic.hasOnlineBooking)
        return {
          content: "This clinic only books by phone. Offer a call script with show_call_script instead.",
          isError: true,
        };
      const want = Date.parse(String(input.slot_iso));
      const slot = clinic.openSlots.find((x) => Date.parse(x) === want && want > Date.now());
      if (!slot)
        return {
          content: `That time isn't open. Open slots: ${clinic.openSlots.filter((x) => Date.parse(x) > Date.now()).join(", ")}`,
          isError: true,
        };
      const confirmation = confirmationNumber();
      const needs = Array.isArray(input.accessibility_needs) ? input.accessibility_needs.filter(isNeed) : [];
      return {
        content: JSON.stringify({
          status: "booked (demo simulation — no real clinic was contacted)",
          confirmation,
          clinic: clinic.name,
          when: label(slot),
          address: clinic.address,
          next_step: "The booking card on screen already has Add to Google Calendar and .ics buttons; point the person to them. Do not call add_to_calendar for this appointment.",
        }),
        action: {
          type: "booking",
          clinicId: clinic.id,
          slot,
          confirmation,
          specialty: clinic.specialty as Specialty,
          reason: typeof input.reason === "string" ? input.reason : undefined,
          needs,
        },
        note: `booked ${clinic.id} at ${slot}, confirmation ${confirmation}`,
      };
    }

    case "show_call_script": {
      const clinic = typeof input.clinic_id === "string" ? getClinicById(input.clinic_id) : undefined;
      if (!clinic) return { content: "No clinic with that id.", isError: true };
      const script = typeof input.script === "string" ? input.script.trim() : "";
      if (script.length < 20) return { content: "The script is empty. Write the full script.", isError: true };
      return {
        content: "The script is now on screen with copy, listen and 'remind me to call' buttons.",
        action: { type: "script", clinicId: clinic.id, script },
        note: `showed call script for ${clinic.id}`,
      };
    }

    case "add_to_calendar": {
      const start = Date.parse(String(input.start_iso));
      if (!input.title || Number.isNaN(start)) return { content: "Need a title and a valid start_iso.", isError: true };
      const minutes = Number.isInteger(input.duration_minutes) ? (input.duration_minutes as number) : 30;
      const event: CalEventData = {
        title: String(input.title).slice(0, 200),
        description: typeof input.description === "string" ? input.description.slice(0, 2000) : "",
        location: typeof input.location === "string" ? input.location.slice(0, 300) : undefined,
        start: new Date(start).toISOString(),
        end: new Date(start + minutes * 60_000).toISOString(),
      };
      return {
        content: "A card with 'Add to Google Calendar' and '.ics' buttons is on screen. The person needs to press one to save it.",
        action: { type: "calendar", event },
        note: `offered calendar event "${event.title}" at ${event.start}`,
      };
    }
  }
  return { content: `Unknown tool ${name}`, isError: true };
}

// ---------- Prompt ----------

function systemPrompt(ctx: ChatContext, memory: string[]): string {
  const now = (() => {
    try {
      return new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: ctx.timeZone }).format(new Date());
    } catch {
      return new Date().toISOString();
    }
  })();
  const p = ctx.profile;
  const profile = p
    ? [
        "What the person already entered in the search form (don't ask again):",
        p.patientName && `- Name: ${p.patientName}`,
        p.insurancePayer && `- Insurance: ${p.insurancePayer}${p.memberId ? `, member ID ${p.memberId}` : ""}`,
        p.specialty && `- Specialty they searched: ${p.specialty}`,
        p.reasonForVisit && `- Reason for visit: ${p.reasonForVisit}`,
        p.urgencyWindowDays && `- Wants to be seen within ${p.urgencyWindowDays} days`,
        p.accessibilityRequirements &&
          `- Accessibility needs: ${ACCESSIBILITY_KEYS.filter((k) => p.accessibilityRequirements?.[k]).join(", ") || "none selected"}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return `You are the Care Guide inside AccessCare Navigator, a demo app that helps people with disabilities find accessible medical care. People talk to you by text or by voice; some are blind or low-vision and hear your replies read aloud.

What you do:
- Help the person work out what kind of care they need (which specialty is the right first stop), from what they tell you and from any PDFs they upload (referral letters, visit summaries, test results, insurance cards).
- Find clinics with find_clinics. Only mention clinics, times, phone numbers and accessibility features that the tool returned. Never invent them.
- Book with book_appointment only at clinics with online booking, only for a slot the tool listed, and only after the person clearly says yes to that clinic and time. Bookings here are a simulation; say so briefly the first time.
- For phone-only clinics, write a call script and show it with show_call_script.
- Booking cards and call-script cards already include calendar buttons; point to those. Use add_to_calendar only for other events (a follow-up, a reminder on another day) when the person asks.

Gather what you need one or two questions at a time: what's going on, insurance company, accessibility needs (wheelchair-accessible exam room, adjustable-height exam table, quiet waiting room, ASL interpreter, service animal), how soon, and their name before booking.

Documents: say in plain words what matters for booking (for example "your referral is to neurology" or "it says you use a wheelchair"). Don't interpret results beyond what the document states, and never diagnose. Confirm any accessibility needs you read from a document before using them.

Safety: You are not a doctor. Don't diagnose or name what someone has. When unsure which specialist, suggest a general physician (Primary Care) first. If anything could be an emergency (chest pain or pressure, trouble breathing, stroke signs, severe bleeding, thoughts of self-harm), tell them to call 911 or go to the nearest emergency room right away, before anything else.

Style: warm, plain and short: under 120 words per reply, because replies may be read aloud. No markdown (no asterisks, headings or tables); a short numbered list is fine. ${languageRule(ctx.d)} If the person writes in another language, reply in theirs.

Now for the person: ${now} (${ctx.timeZone}). Slot labels from find_clinics are already in their time zone.
${profile}
${memory.length ? `\nNotes from earlier in this conversation (tool results):\n${memory.map((m) => `- ${m}`).join("\n")}` : ""}`;
}

// ---------- Conversation -> API messages ----------

function toMessages(turns: ChatTurn[]): unknown[] {
  const out: { role: "user" | "assistant"; content: unknown[] }[] = [];
  for (const t of turns) {
    const blocks: unknown[] = [];
    if (t.role === "user") {
      for (const doc of t.docs ?? []) {
        blocks.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: doc.data },
          title: doc.name.slice(0, 200),
        });
      }
    }
    if (t.text.trim()) blocks.push({ type: "text", text: t.text.trim() });
    if (!blocks.length) continue;
    const last = out[out.length - 1];
    if (last && last.role === t.role) last.content.push(...blocks); // keep roles alternating
    else out.push({ role: t.role, content: blocks });
  }
  while (out.length && out[0].role !== "user") out.shift(); // must start with the person
  return out;
}

const cleanReply = (s: string) =>
  s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();

// ---------- The loop ----------

const MAX_ROUNDS = 6;
// Whole-turn budget, so a reply always lands inside a 60 s serverless limit
const TURN_BUDGET_MS = 52_000;

async function runWith(provider: Provider, turns: ChatTurn[], ctx: ChatContext): Promise<ChatReply> {
  const memory = turns.filter((t) => t.role === "assistant" && t.memory).map((t) => t.memory as string);
  const system = systemPrompt(ctx, memory);
  const messages = toMessages(turns);
  const actions: ChatAction[] = [];
  const notes: string[] = [];
  let lastText = "";
  const deadline = Date.now() + TURN_BUDGET_MS;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const left = deadline - Date.now();
    if (left < 8_000) break; // not enough time for another model call; reply with what we have
    const res = await callRaw(provider, { system, messages, tools: TOOLS, maxTokens: 8000, effort: "medium", timeoutMs: left });
    if (res.stop_reason === "refusal") throw new Error(`${provider}: model declined`);
    messages.push({ role: "assistant", content: res.content }); // unchanged, thinking blocks included

    const text = res.content
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (text) lastText = text;

    const calls = res.content.filter((b): b is RawBlock & { id: string; name: string } => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !calls.length) break;

    const results = calls.map((c) => {
      const out = runTool(c.name, c.input, ctx);
      if (out.action) actions.push(out.action);
      if (out.note) notes.push(out.note);
      return { type: "tool_result", tool_use_id: c.id, content: out.content, ...(out.isError ? { is_error: true } : {}) };
    });
    messages.push({ role: "user", content: results }); // all results in one message
  }

  return { reply: cleanReply(lastText) || "…", actions, memory: notes.join(" | "), source: provider };
}

export async function runCareGuide(turns: ChatTurn[], ctx: ChatContext): Promise<ChatReply> {
  for (const provider of availableProviders()) {
    try {
      return await runWith(provider, turns, ctx);
    } catch (err) {
      console.warn(`[care-guide] ${provider} failed, falling back:`, (err as Error).message);
    }
  }
  return { reply: ctx.d.tpl.chatUnavailable, actions: [], memory: "", source: "template" };
}
