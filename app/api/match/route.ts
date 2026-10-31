import { NextResponse } from "next/server";
import { getClinics } from "@/lib/clinics";
import { scoreClinics } from "@/lib/matching";
import { generateMatchExplanation, templateExplanation } from "@/lib/ai-client";
import { validateIntake } from "@/lib/validate";
import type { MatchResult } from "@/lib/types";
import { getDict } from "@/lib/i18n";

const AI_EXPLAINED_COUNT = 5;

// AI calls can take a while; Vercel's default function limit is shorter.
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ errors: ["Request body must be valid JSON."] }, { status: 400 });
  }

  const { data: intake, errors } = validateIntake(body);
  if (!intake) return NextResponse.json({ errors }, { status: 400 });
  const d = getDict((body as { lang?: unknown }).lang);

  const scored = scoreClinics(intake, getClinics());

  // Only the top matches get an AI explanation (latency + cost); the rest use the template.
  // allSettled so one failed call never sinks the others.
  const settled = await Promise.allSettled(
    scored.slice(0, AI_EXPLAINED_COUNT).map((s) =>
      generateMatchExplanation({
        clinic: s.clinic,
        requirements: intake.accessibilityRequirements,
        inNetwork: s.inNetwork,
        slotsInWindow: s.slotsInWindow,
        urgencyWindowDays: intake.urgencyWindowDays,
      }, d),
    ),
  );

  const results: MatchResult[] = scored.map((s, i) => {
    const r = settled[i];
    if (r?.status === "fulfilled") return { ...s, explanation: r.value.text, explanationSource: r.value.source };
    return {
      ...s,
      explanation: templateExplanation({
        clinic: s.clinic,
        requirements: intake.accessibilityRequirements,
        inNetwork: s.inNetwork,
        slotsInWindow: s.slotsInWindow,
        urgencyWindowDays: intake.urgencyWindowDays,
      }, d),
      explanationSource: "template",
    };
  });

  return NextResponse.json({ results });
}
