import rawClinics from "@/data/clinics.json";
import type { Clinic } from "./types";

// The slots in clinics.json are authored relative to this date. At load time we
// shift every slot by the same number of whole days so the demo always shows
// upcoming appointments, no matter when the repo is cloned.
const DATA_ANCHOR_UTC = Date.UTC(2026, 10, 1); // 2026-11-01
const DAY_MS = 86_400_000;

function shiftedSlots(slots: string[]): string[] {
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const shiftDays = Math.round((todayUtc - DATA_ANCHOR_UTC) / DAY_MS);
  return slots.map((iso) => new Date(Date.parse(iso) + shiftDays * DAY_MS).toISOString());
}

export function getClinics(): Clinic[] {
  return (rawClinics as Clinic[]).map((c) => ({ ...c, openSlots: shiftedSlots(c.openSlots) }));
}

export function getClinicById(id: string): Clinic | undefined {
  return getClinics().find((c) => c.id === id);
}
