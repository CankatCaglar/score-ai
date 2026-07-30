export const MAX_BRAND_DNA_COLORS = 6;
export const MAX_BRAND_DNA_PERSONALITY = 5;
export const MAX_BRAND_DNA_TONE = 5;
export const MAX_BRAND_DNA_AUDIENCES = 8;
export const MAX_BRAND_DNA_KEYWORDS = 10;
export const MAX_BRAND_DNA_AUDIENCE_NOTE = 80;
export const MAX_BRAND_DNA_LOGO_BYTES = 5 * 1024 * 1024;

export const BRAND_DNA_SECTION_WEIGHT = 12.5;
export const BRAND_DNA_SECTION_COUNT = 8;

export type BrandDnaLogo = {
  storagePath: string;
  mediaUrl: string;
  fileName: string;
  contentType: string;
};

export type BrandDnaProfile = {
  id: string;
  ownerEmail: string;
  logo: BrandDnaLogo | null;
  colors: string[];
  headingFont: string | null;
  bodyFont: string | null;
  personality: string[];
  toneOfVoice: string[];
  audiences: string[];
  audienceNote: string;
  sectorMain: string | null;
  sectorSub: string | null;
  keywords: string[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type CompletionSectionStatus = "Tamamlandı" | "Eksik";

export type BrandDnaCompletionSections = {
  logo: CompletionSectionStatus;
  colors: CompletionSectionStatus;
  typography: CompletionSectionStatus;
  personality: CompletionSectionStatus;
  toneOfVoice: CompletionSectionStatus;
  audience: CompletionSectionStatus;
  sector: CompletionSectionStatus;
  keywords: CompletionSectionStatus;
};

export type BrandDnaCompletion = {
  score: number;
  label: "Zayıf" | "Orta" | "İyi" | "Mükemmel";
  sections: BrandDnaCompletionSections;
};

export type BrandDnaPublicProfile = BrandDnaProfile & {
  completion: BrandDnaCompletion;
};

export function emptyBrandDna(ownerEmail: string, id: string): BrandDnaProfile {
  return {
    id,
    ownerEmail,
    logo: null,
    colors: [],
    headingFont: null,
    bodyFont: null,
    personality: [],
    toneOfVoice: [],
    audiences: [],
    audienceNote: "",
    sectorMain: null,
    sectorSub: null,
    keywords: [],
    createdAt: null,
    updatedAt: null,
  };
}

export function brandDnaScoreLabel(score: number): BrandDnaCompletion["label"] {
  if (score >= 90) return "Mükemmel";
  if (score >= 70) return "İyi";
  if (score >= 40) return "Orta";
  return "Zayıf";
}

export function computeBrandDnaCompletion(
  profile: BrandDnaProfile,
): BrandDnaCompletion {
  const logoDone = Boolean(profile.logo?.mediaUrl || profile.logo?.storagePath);
  const colorsDone = profile.colors.length >= 1;
  const typographyDone = Boolean(
    profile.headingFont?.trim() && profile.bodyFont?.trim(),
  );
  const personalityDone = profile.personality.length >= 1;
  const toneDone = profile.toneOfVoice.length >= 1;
  const audienceDone =
    profile.audiences.length >= 1 || profile.audienceNote.trim().length > 0;
  const sectorDone = Boolean(profile.sectorMain?.trim());
  const keywordsDone = profile.keywords.length >= 1;

  const flags = [
    logoDone,
    colorsDone,
    typographyDone,
    personalityDone,
    toneDone,
    audienceDone,
    sectorDone,
    keywordsDone,
  ];
  const score = Math.round(
    flags.filter(Boolean).length * BRAND_DNA_SECTION_WEIGHT,
  );

  const status = (done: boolean): CompletionSectionStatus =>
    done ? "Tamamlandı" : "Eksik";

  return {
    score,
    label: brandDnaScoreLabel(score),
    sections: {
      logo: status(logoDone),
      colors: status(colorsDone),
      typography: status(typographyDone),
      personality: status(personalityDone),
      toneOfVoice: status(toneDone),
      audience: status(audienceDone),
      sector: status(sectorDone),
      keywords: status(keywordsDone),
    },
  };
}

/** Client + server shared HEX validation: #RGB or #RRGGBB */
export const HEX_COLOR_RE = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value.trim());
}

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (!isValidHexColor(trimmed)) return null;
  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return trimmed.toUpperCase();
}

export type BrandDnaMode = "provided" | "partial" | "missing";

/** provided ≥90, partial >0, missing = boş */
export function resolveBrandDnaMode(profile: BrandDnaProfile): BrandDnaMode {
  const { score } = computeBrandDnaCompletion(profile);
  if (score <= 0) return "missing";
  if (score >= 90) return "provided";
  return "partial";
}
