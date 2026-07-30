export const BRAND_PROMISE_MAX_LENGTH = 160;
export const MAX_COMPETITORS = 8;
export const MAX_COMPETITOR_POSTS = 6;
export const MAX_HISTORICAL_MEDIA = 12;
/** Analiz kalitesi için önerilen minimum geçmiş içerik sayısı. */
export const MIN_HISTORICAL_MEDIA = 6;
export const MAX_TRUST_PROOFS = 10;
export const MAX_TRUST_PROOF_BYTES = 10 * 1024 * 1024;

export type CompetitorType = "instagram" | "website";
export type CompetitorStatus = "pending" | "ready" | "failed";
export type HistoricalMediaSource = "instagram" | "website" | "upload";

export type CompetitorPost = {
  id: string;
  url: string;
  storagePath: string | null;
  mediaUrl: string | null;
  caption: string | null;
  fetchedAt: string;
};

export type Competitor = {
  id: string;
  input: string;
  type: CompetitorType;
  status: CompetitorStatus;
  posts: CompetitorPost[];
  summary: string | null;
  errorMessage: string | null;
  updatedAt: string;
};

export type BrandInstagramAccount = {
  connected: boolean;
  username: string | null;
  igUserId: string | null;
};

export type HistoricalMediaItem = {
  id: string;
  source: HistoricalMediaSource;
  storagePath: string;
  mediaUrl: string;
  contentType: string;
  fileName: string | null;
  createdAt: string;
};

export type TrustProof = {
  id: string;
  fileName: string;
  contentType: string;
  storagePath: string;
  mediaUrl: string;
  sizeBytes: number;
  extractedText: string | null;
  createdAt: string;
};

export type BrandAccount = {
  instagram: BrandInstagramAccount;
  websiteUrl: string | null;
  historicalMedia: HistoricalMediaItem[];
};

export type BrandIntelligenceProfile = {
  id: string;
  ownerEmail: string;
  brandPromise: string;
  competitors: Competitor[];
  brandAccount: BrandAccount;
  trustProofs: TrustProof[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type CompletionSectionStatus = "Tamamlandı" | "Eksik" | "Opsiyonel";

export type BrandIntelligenceCompletion = {
  score: number;
  sections: {
    brandPromise: CompletionSectionStatus;
    competitors: CompletionSectionStatus;
    historical: CompletionSectionStatus;
    trustProofs: CompletionSectionStatus;
  };
};

export type InstagramIntegration = {
  connected: boolean;
  username: string | null;
  igUserId: string | null;
  pageId: string | null;
  accessToken: string | null;
  tokenExpiresAt: string | null;
  scopes: string[];
  connectedAt: string | null;
  updatedAt: string | null;
};

export type UserIntegrations = {
  id: string;
  ownerEmail: string;
  instagram: InstagramIntegration;
  createdAt: string | null;
  updatedAt: string | null;
};

export function emptyBrandIntelligence(
  ownerEmail: string,
  id: string,
): BrandIntelligenceProfile {
  return {
    id,
    ownerEmail,
    brandPromise: "",
    competitors: [],
    brandAccount: {
      instagram: {
        connected: false,
        username: null,
        igUserId: null,
      },
      websiteUrl: null,
      historicalMedia: [],
    },
    trustProofs: [],
    createdAt: null,
    updatedAt: null,
  };
}

export function computeCompletion(
  profile: BrandIntelligenceProfile,
  options?: { instagramConnected?: boolean },
): BrandIntelligenceCompletion {
  const promiseDone = profile.brandPromise.trim().length > 0;
  // Eklemek yeterli; fetch ready/failed analizi etkiler ama tamamlanma eklenince ilerler
  const competitorDone = profile.competitors.length > 0;
  const historicalCount = profile.brandAccount.historicalMedia.length;
  const igConnected =
    profile.brandAccount.instagram.connected ||
    Boolean(options?.instagramConnected);
  const historicalDone = igConnected || historicalCount >= MIN_HISTORICAL_MEDIA;
  const historicalOptional =
    !historicalDone && historicalCount === 0 && !igConnected;
  const trustDone = profile.trustProofs.length > 0;

  let score = 0;
  if (promiseDone) score += 25;
  if (competitorDone) score += 25;
  if (historicalDone) score += 25;
  if (trustDone) score += 25;

  return {
    score,
    sections: {
      brandPromise: promiseDone ? "Tamamlandı" : "Eksik",
      competitors: competitorDone ? "Tamamlandı" : "Eksik",
      historical: historicalDone
        ? "Tamamlandı"
        : historicalOptional
          ? "Opsiyonel"
          : "Eksik",
      trustProofs: trustDone ? "Tamamlandı" : "Eksik",
    },
  };
}
