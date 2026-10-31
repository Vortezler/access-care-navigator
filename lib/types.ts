export interface AccessibilityRequirements {
  wheelchairAccessibleExamRoom: boolean;
  adjustableHeightExamTable: boolean;
  sensoryQuietWaitingRoom: boolean;
  aslInterpreterRequired: boolean;
  serviceAnimalFriendly: boolean;
}

export type AccessibilityKey = keyof AccessibilityRequirements;

export interface IntakeData {
  patientName: string;
  insurancePayer: string;
  memberId: string;
  specialty: string;
  reasonForVisit: string;
  urgencyWindowDays: number;
  accessibilityRequirements: AccessibilityRequirements;
  autonomyMode: "auto_book_preferred" | "call_prep_only";
}

export interface Clinic {
  id: string;
  name: string;
  specialty: string;
  address: string;
  phone: string;
  insuranceNetworks: string[];
  accessibility: AccessibilityRequirements;
  hasOnlineBooking: boolean;
  openSlots: string[]; // ISO datetimes
}

/** Where a piece of generated text came from — shown to the user for honesty. */
export type TextSource = "bedrock" | "anthropic" | "template";

export interface MatchResult {
  clinic: Clinic;
  inNetwork: boolean;
  requirementsMetCount: number;
  requirementsTotalCount: number;
  slotsInWindow: number;
  score: number; // 0-100
  explanation: string; // AI-generated or templated fallback
  explanationSource: TextSource;
}

export const SPECIALTIES = [
  "Neurology",
  "Cardiology",
  "Dermatology",
  "Orthopedics",
  "Psychiatry",
  "Primary Care",
  "OB/GYN",
  "Pediatrics",
  "ENT",
  "Physical Therapy",
] as const;

export const ACCESSIBILITY_LABELS: Record<AccessibilityKey, string> = {
  wheelchairAccessibleExamRoom: "Wheelchair-accessible exam room",
  adjustableHeightExamTable: "Adjustable-height exam table",
  sensoryQuietWaitingRoom: "Sensory-friendly / quiet waiting room",
  aslInterpreterRequired: "ASL interpreter available",
  serviceAnimalFriendly: "Service-animal friendly",
};

export const ACCESSIBILITY_KEYS = Object.keys(ACCESSIBILITY_LABELS) as AccessibilityKey[];
