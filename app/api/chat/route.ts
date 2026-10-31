import { NextResponse } from "next/server";
import type { ChatTurn } from "@/lib/care-guide";
import { runCareGuide } from "@/lib/care-guide";
import { getDict, isLang, speechLocale } from "@/lib/i18n";
import type { IntakeData } from "@/lib/types";

const MAX_TURNS = 40;
const MAX_TEXT = 4000;
const MAX_DOCS = 6; // across the whole conversation
const MAX_DOC_B64 = 14_000_000; // ≈ 10 MB PDF
const MAX_TOTAL_B64 = 30_000_000;

function bad(msg: string, status = 400) {
  return NextResponse.json({ errors: [msg] }, { status });
}

// AI calls can take a while; Vercel's default function limit is shorter.
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { messages?: unknown; lang?: unknown; tz?: unknown; profile?: unknown };
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ errors: ["Request body must be a JSON object."] }, { status: 400 });
    }
  } catch {
    return bad("Request body must be valid JSON.");
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) return bad("No messages.");
  if (body.messages.length > MAX_TURNS) return bad("This conversation is too long. Start a new one.");

  let docCount = 0;
  let totalB64 = 0;
  const turns: ChatTurn[] = [];
  for (const m of body.messages as Record<string, unknown>[]) {
    if (m?.role !== "user" && m?.role !== "assistant") return bad("Invalid message role.");
    if (typeof m.text !== "string" || m.text.length > MAX_TEXT) return bad("Message text is missing or too long.");
    const docs: ChatTurn["docs"] = [];
    if (m.role === "user" && Array.isArray(m.docs)) {
      for (const d of m.docs as Record<string, unknown>[]) {
        if (typeof d?.name !== "string" || typeof d?.data !== "string") return bad("Invalid attachment.");
        if (d.data.length > MAX_DOC_B64) return bad(`${d.name} is larger than 10 MB.`);
        if (!/^[A-Za-z0-9+/=]+$/.test(d.data.slice(0, 200)) || !d.data.startsWith("JVBER")) return bad(`${d.name} isn't a PDF.`);
        docCount++;
        totalB64 += d.data.length;
        docs.push({ name: d.name, data: d.data });
      }
    }
    if (docCount > MAX_DOCS) return bad(`Up to ${MAX_DOCS} PDFs per conversation.`);
    if (totalB64 > MAX_TOTAL_B64) return bad("Attachments are too large in total.");
    turns.push({
      role: m.role,
      text: m.text,
      docs,
      memory: m.role === "assistant" && typeof m.memory === "string" ? m.memory.slice(0, 4000) : undefined,
    });
  }

  const lang = isLang(body.lang) ? body.lang : "en";
  let timeZone = "UTC";
  if (typeof body.tz === "string") {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: body.tz });
      timeZone = body.tz;
    } catch {
      /* unknown zone: keep UTC */
    }
  }
  const profile = body.profile && typeof body.profile === "object" ? (body.profile as Partial<IntakeData>) : null;

  const result = await runCareGuide(turns, { d: getDict(lang), locale: speechLocale(lang), timeZone, profile });
  return NextResponse.json(result);
}
