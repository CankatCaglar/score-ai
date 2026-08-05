import type { AppLocale } from "@/i18n/routing";

export type UserProfile = {
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  displayName: string;
  company: string;
  sector: string;
  /** App UI locale code: `tr` | `en` (legacy labels normalized on read). */
  language: string;
  timezone: string;
  country: string;
  photoURL: string | null;
  provider: string | null;
  freeAnalysesRemaining?: number;
  analysesUsed?: number;
};

export const PROFILE_SECTORS = [
  "Pazarlama Ajansı",
  "E-ticaret",
  "SaaS",
  "Medya",
  "Diğer",
] as const;

/** Stored profile language values (locale codes). */
export const PROFILE_LANGUAGES = ["tr", "en"] as const;
export type ProfileLanguage = (typeof PROFILE_LANGUAGES)[number];

export const PROFILE_LANGUAGE_LABELS: Record<ProfileLanguage, string> = {
  tr: "Türkçe",
  en: "English",
};

/** Map Firestore / legacy labels to a supported app locale. */
export function normalizeProfileLanguage(
  value: string | null | undefined,
): AppLocale {
  const v = (value ?? "").trim();
  if (v === "en" || v === "English") return "en";
  return "tr";
}

export const PROFILE_TIMEZONES = [
  "(GMT+03:00) İstanbul",
  "(GMT+00:00) London",
  "(GMT-05:00) New York",
] as const;

export const PROFILE_COUNTRIES = ["Türkiye", "Almanya", "Amerika"] as const;

export function userDocIdFromEmail(email: string): string {
  return Buffer.from(email.trim().toLowerCase()).toString("base64url");
}

export function splitDisplayName(displayName?: string | null): {
  firstName: string;
  lastName: string;
} {
  const parts = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  };
}

export function composeDisplayName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export function initialsFromProfile(profile: Pick<UserProfile, "firstName" | "lastName" | "email" | "displayName">): string {
  const first = profile.firstName.trim();
  const last = profile.lastName.trim();
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first.length >= 2) return first.slice(0, 2).toUpperCase();
  if (profile.displayName.trim().length >= 2) {
    return profile.displayName.trim().slice(0, 2).toUpperCase();
  }
  return (profile.email.slice(0, 2) || "SC").toUpperCase();
}
