import { NextResponse } from "next/server";
import { suggestSpecialty } from "@/lib/triage";
import { getDict } from "@/lib/i18n";

const MIN = 3;
const MAX = 2000;

// AI calls can take a while; Vercel's default function limit is shorter.
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { symptoms?: unknown; lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ errors: ["Request body must be valid JSON."] }, { status: 400 });
  }

  const symptoms = typeof body.symptoms === "string" ? body.symptoms.trim() : "";
  if (symptoms.length < MIN) {
    return NextResponse.json({ errors: ["Describe your symptoms in a few words first."] }, { status: 400 });
  }
  if (symptoms.length > MAX) {
    return NextResponse.json({ errors: [`Please keep it under ${MAX} characters.`] }, { status: 400 });
  }

  const { value, source } = await suggestSpecialty(symptoms, getDict(body.lang));
  return NextResponse.json({ suggestion: value, source });
}
