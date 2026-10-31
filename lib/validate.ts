import type { IntakeData } from "./types";
import { ACCESSIBILITY_KEYS, SPECIALTIES } from "./types";

/** Basic manual shape check. Returns a list of human-readable problems (empty = valid). */
export function validateIntake(body: unknown): { data?: IntakeData; errors: string[] } {
  const errors: string[] = [];
  if (!body || typeof body !== "object") return { errors: ["Request body must be a JSON object."] };
  const b = body as Record<string, unknown>;

  const str = (k: string, label: string) => {
    if (typeof b[k] !== "string" || !(b[k] as string).trim()) errors.push(`${label} is required.`);
  };
  str("patientName", "Name");
  str("insurancePayer", "Insurance payer");
  str("memberId", "Member ID");
  str("reasonForVisit", "Reason for visit");

  if (!SPECIALTIES.includes(b.specialty as (typeof SPECIALTIES)[number])) errors.push("Choose a specialty from the list.");

  const days = Number(b.urgencyWindowDays);
  if (!Number.isInteger(days) || days < 1 || days > 365) errors.push("Urgency window must be a whole number from 1 to 365.");

  if (b.autonomyMode !== "auto_book_preferred" && b.autonomyMode !== "call_prep_only") errors.push("Choose a booking preference.");

  const reqs = b.accessibilityRequirements as Record<string, unknown> | undefined;
  if (!reqs || typeof reqs !== "object" || ACCESSIBILITY_KEYS.some((k) => reqs[k] !== undefined && typeof reqs[k] !== "boolean")) {
    errors.push("Accessibility requirements are malformed.");
  }

  if (errors.length) return { errors };
  return {
    errors,
    data: {
      patientName: (b.patientName as string).trim(),
      insurancePayer: (b.insurancePayer as string).trim(),
      memberId: (b.memberId as string).trim(),
      specialty: b.specialty as string,
      reasonForVisit: (b.reasonForVisit as string).trim(),
      urgencyWindowDays: days,
      autonomyMode: b.autonomyMode as IntakeData["autonomyMode"],
      accessibilityRequirements: Object.fromEntries(
        ACCESSIBILITY_KEYS.map((k) => [k, reqs![k] === true]),
      ) as unknown as IntakeData["accessibilityRequirements"],
    },
  };
}
