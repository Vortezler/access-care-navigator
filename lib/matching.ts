import type { AccessibilityRequirements, Clinic, IntakeData, MatchResult } from "./types";
import { ACCESSIBILITY_KEYS } from "./types";

export type ScoredClinic = Omit<MatchResult, "explanation" | "explanationSource">;

const DAY_MS = 86_400_000;

/** Case-insensitive match in either direction, so "blue cross" finds "Blue Cross Blue Shield". */
export function isInNetwork(insurancePayer: string, networks: string[]): boolean {
  const payer = insurancePayer.trim().toLowerCase();
  if (!payer) return false;
  return networks.some((n) => {
    const net = n.toLowerCase();
    return net.includes(payer) || payer.includes(net);
  });
}

export function countRequirements(
  requested: AccessibilityRequirements,
  offered: AccessibilityRequirements,
): { met: number; total: number } {
  const wanted = ACCESSIBILITY_KEYS.filter((k) => requested[k]);
  return { met: wanted.filter((k) => offered[k]).length, total: wanted.length };
}

export function slotsWithinDays(slots: string[], days: number, now = Date.now()): number {
  const limit = now + days * DAY_MS;
  return slots.filter((s) => {
    const t = Date.parse(s);
    return t > now && t <= limit;
  }).length;
}

/**
 * Hard filter on specialty; insurance and accessibility feed the score.
 * Insurance is scored rather than filtered so a user with an unlisted payer
 * still sees options (clearly flagged out-of-network) instead of an empty page.
 */
export function scoreClinics(intake: IntakeData, clinics: Clinic[]): ScoredClinic[] {
  return clinics
    .filter((c) => c.specialty === intake.specialty)
    .map((clinic) => {
      const inNetwork = isInNetwork(intake.insurancePayer, clinic.insuranceNetworks);
      const { met, total } = countRequirements(intake.accessibilityRequirements, clinic.accessibility);
      const ratio = total === 0 ? 1 : met / total;
      const score = Math.round((inNetwork ? 50 : 0) + ratio * 50);
      return {
        clinic,
        inNetwork,
        requirementsMetCount: met,
        requirementsTotalCount: total,
        slotsInWindow: slotsWithinDays(clinic.openSlots, intake.urgencyWindowDays),
        score,
      };
    })
    .sort((a, b) => b.score - a.score || b.slotsInWindow - a.slotsInWindow);
}
