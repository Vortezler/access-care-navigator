import { NextResponse } from "next/server";
import { getClinicById } from "@/lib/clinics";
import { generateAdvocacyScript } from "@/lib/ai-client";
import { validateIntake } from "@/lib/validate";
import { getDict } from "@/lib/i18n";

// AI calls can take a while; Vercel's default function limit is shorter.
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { clinicId?: unknown; intakeData?: unknown; lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ errors: ["Request body must be valid JSON."] }, { status: 400 });
  }

  const clinic = typeof body.clinicId === "string" ? getClinicById(body.clinicId) : undefined;
  if (!clinic) return NextResponse.json({ errors: ["Unknown clinic."] }, { status: 404 });

  const { data: intake, errors } = validateIntake(body.intakeData);
  if (!intake) return NextResponse.json({ errors }, { status: 400 });

  const { text, source } = await generateAdvocacyScript(clinic, intake, getDict(body.lang));
  return NextResponse.json({ script: text, source });
}
