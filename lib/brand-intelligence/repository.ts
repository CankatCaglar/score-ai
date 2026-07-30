import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  getAdminDb,
  getAdminStorage,
  getAdminStorageBucketName,
} from "@/lib/firebase-admin";
import { userDocIdFromEmail } from "@/lib/user-profile";
import {
  BRAND_PROMISE_MAX_LENGTH,
  MAX_COMPETITORS,
  MAX_HISTORICAL_MEDIA,
  MAX_TRUST_PROOFS,
  computeCompletion,
  emptyBrandIntelligence,
  type BrandIntelligenceProfile,
  type Competitor,
  type CompetitorPost,
  type CompetitorType,
  type HistoricalMediaItem,
  type HistoricalMediaSource,
  type InstagramIntegration,
  type TrustProof,
  type UserIntegrations,
} from "@/lib/brand-intelligence/types";

const COLLECTIONS = {
  brandIntelligence: "brand_intelligence",
  integrations: "integrations",
} as const;

function timestampToIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function publicGcsUrl(storagePath: string): string {
  const bucket = getAdminStorageBucketName();
  return `https://storage.googleapis.com/${bucket}/${storagePath}`;
}

function mapCompetitor(raw: Record<string, unknown>): Competitor {
  const posts = Array.isArray(raw.posts)
    ? raw.posts.map((item) => {
        const post = (item ?? {}) as Record<string, unknown>;
        return {
          id: String(post.id ?? randomUUID()),
          url: String(post.url ?? ""),
          storagePath:
            typeof post.storagePath === "string" ? post.storagePath : null,
          mediaUrl: typeof post.mediaUrl === "string" ? post.mediaUrl : null,
          caption: typeof post.caption === "string" ? post.caption : null,
          fetchedAt: String(post.fetchedAt ?? new Date().toISOString()),
        } satisfies CompetitorPost;
      })
    : [];

  return {
    id: String(raw.id ?? randomUUID()),
    input: String(raw.input ?? ""),
    type: raw.type === "website" ? "website" : "instagram",
    status:
      raw.status === "ready" || raw.status === "failed" || raw.status === "pending"
        ? raw.status
        : "pending",
    posts,
    summary: typeof raw.summary === "string" ? raw.summary : null,
    errorMessage: typeof raw.errorMessage === "string" ? raw.errorMessage : null,
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

function mapProfile(
  id: string,
  ownerEmail: string,
  data: Record<string, unknown>,
): BrandIntelligenceProfile {
  const brandAccountRaw = (data.brandAccount ?? {}) as Record<string, unknown>;
  const instagramRaw = (brandAccountRaw.instagram ?? {}) as Record<string, unknown>;
  const historicalMedia = Array.isArray(brandAccountRaw.historicalMedia)
    ? brandAccountRaw.historicalMedia.map((item) => {
        const media = (item ?? {}) as Record<string, unknown>;
        return {
          id: String(media.id ?? randomUUID()),
          source:
            media.source === "instagram" ||
            media.source === "website" ||
            media.source === "upload"
              ? media.source
              : "upload",
          storagePath: String(media.storagePath ?? ""),
          mediaUrl: String(media.mediaUrl ?? ""),
          contentType: String(media.contentType ?? "application/octet-stream"),
          fileName: typeof media.fileName === "string" ? media.fileName : null,
          createdAt: String(media.createdAt ?? new Date().toISOString()),
        } satisfies HistoricalMediaItem;
      })
    : [];

  const trustProofs = Array.isArray(data.trustProofs)
    ? data.trustProofs.map((item) => {
        const proof = (item ?? {}) as Record<string, unknown>;
        return {
          id: String(proof.id ?? randomUUID()),
          fileName: String(proof.fileName ?? "file"),
          contentType: String(proof.contentType ?? "application/octet-stream"),
          storagePath: String(proof.storagePath ?? ""),
          mediaUrl: String(proof.mediaUrl ?? ""),
          sizeBytes: Number(proof.sizeBytes ?? 0),
          extractedText:
            typeof proof.extractedText === "string" ? proof.extractedText : null,
          createdAt: String(proof.createdAt ?? new Date().toISOString()),
        } satisfies TrustProof;
      })
    : [];

  const competitors = Array.isArray(data.competitors)
    ? data.competitors.map((item) =>
        mapCompetitor((item ?? {}) as Record<string, unknown>),
      )
    : [];

  return {
    id,
    ownerEmail,
    brandPromise: String(data.brandPromise ?? "").slice(0, BRAND_PROMISE_MAX_LENGTH),
    competitors,
    brandAccount: {
      instagram: {
        connected: Boolean(instagramRaw.connected),
        username:
          typeof instagramRaw.username === "string" ? instagramRaw.username : null,
        igUserId:
          typeof instagramRaw.igUserId === "string" ? instagramRaw.igUserId : null,
      },
      websiteUrl:
        typeof brandAccountRaw.websiteUrl === "string"
          ? brandAccountRaw.websiteUrl
          : null,
      historicalMedia,
    },
    trustProofs,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function emptyInstagramIntegration(): InstagramIntegration {
  return {
    connected: false,
    username: null,
    igUserId: null,
    pageId: null,
    accessToken: null,
    tokenExpiresAt: null,
    scopes: [],
    connectedAt: null,
    updatedAt: null,
  };
}

function mapIntegrations(
  id: string,
  ownerEmail: string,
  data: Record<string, unknown>,
): UserIntegrations {
  const ig = (data.instagram ?? {}) as Record<string, unknown>;
  return {
    id,
    ownerEmail,
    instagram: {
      connected: Boolean(ig.connected),
      username: typeof ig.username === "string" ? ig.username : null,
      igUserId: typeof ig.igUserId === "string" ? ig.igUserId : null,
      pageId: typeof ig.pageId === "string" ? ig.pageId : null,
      accessToken: typeof ig.accessToken === "string" ? ig.accessToken : null,
      tokenExpiresAt:
        typeof ig.tokenExpiresAt === "string" ? ig.tokenExpiresAt : null,
      scopes: Array.isArray(ig.scopes)
        ? ig.scopes.map((s) => String(s))
        : [],
      connectedAt: timestampToIso(ig.connectedAt) ?? (typeof ig.connectedAt === "string" ? ig.connectedAt : null),
      updatedAt: timestampToIso(ig.updatedAt) ?? (typeof ig.updatedAt === "string" ? ig.updatedAt : null),
    },
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export async function getBrandIntelligence(
  ownerEmail: string,
): Promise<BrandIntelligenceProfile> {
  const db = getAdminDb();
  const id = userDocIdFromEmail(ownerEmail);
  const snap = await db.collection(COLLECTIONS.brandIntelligence).doc(id).get();
  if (!snap.exists) {
    return emptyBrandIntelligence(ownerEmail, id);
  }
  return mapProfile(id, ownerEmail, snap.data() as Record<string, unknown>);
}

export async function ensureBrandIntelligence(
  ownerEmail: string,
): Promise<BrandIntelligenceProfile> {
  const db = getAdminDb();
  const id = userDocIdFromEmail(ownerEmail);
  const ref = db.collection(COLLECTIONS.brandIntelligence).doc(id);
  const snap = await ref.get();
  if (snap.exists) {
    return mapProfile(id, ownerEmail, snap.data() as Record<string, unknown>);
  }
  const empty = emptyBrandIntelligence(ownerEmail, id);
  await ref.set({
    id,
    ownerEmail,
    brandPromise: "",
    competitors: [],
    brandAccount: empty.brandAccount,
    trustProofs: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return empty;
}

export async function updateBrandIntelligenceFields(
  ownerEmail: string,
  patch: {
    brandPromise?: string;
    websiteUrl?: string | null;
  },
): Promise<BrandIntelligenceProfile> {
  const db = getAdminDb();
  const id = userDocIdFromEmail(ownerEmail);
  const ref = db.collection(COLLECTIONS.brandIntelligence).doc(id);
  await ensureBrandIntelligence(ownerEmail);

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (typeof patch.brandPromise === "string") {
    updates.brandPromise = patch.brandPromise
      .trim()
      .slice(0, BRAND_PROMISE_MAX_LENGTH);
  }
  if (patch.websiteUrl !== undefined) {
    updates["brandAccount.websiteUrl"] = patch.websiteUrl;
  }

  await ref.set(updates, { merge: true });
  return getBrandIntelligence(ownerEmail);
}

export async function addCompetitor(
  ownerEmail: string,
  input: string,
  type: CompetitorType,
): Promise<{ profile: BrandIntelligenceProfile; competitor: Competitor }> {
  const profile = await ensureBrandIntelligence(ownerEmail);
  if (profile.competitors.length >= MAX_COMPETITORS) {
    throw new Error("MAX_COMPETITORS");
  }

  const normalized = input.trim();
  if (!normalized) throw new Error("INPUT_REQUIRED");

  const { extractInstagramHandle } = await import("@/lib/instagram/resolve");
  const incomingHandle = extractInstagramHandle(normalized);

  const integrations = await getUserIntegrations(ownerEmail);
  const ownHandles = new Set(
    [
      profile.brandAccount.instagram.username,
      integrations.instagram.username,
    ]
      .filter((h): h is string => Boolean(h?.trim()))
      .map((h) => h.replace(/^@/, "").toLowerCase()),
  );

  if (incomingHandle && ownHandles.has(incomingHandle.toLowerCase())) {
    throw new Error("OWN_BRAND_AS_COMPETITOR");
  }

  const duplicate = profile.competitors.some((c) => {
    const existingHandle = extractInstagramHandle(c.input);
    if (incomingHandle && existingHandle) {
      return existingHandle.toLowerCase() === incomingHandle.toLowerCase();
    }
    return c.input.trim().toLowerCase() === normalized.toLowerCase();
  });
  if (duplicate) {
    throw new Error("DUPLICATE_COMPETITOR");
  }

  const competitor: Competitor = {
    id: randomUUID(),
    input: normalized,
    type,
    status: "pending",
    posts: [],
    summary: null,
    errorMessage: null,
    updatedAt: new Date().toISOString(),
  };

  const db = getAdminDb();
  const id = userDocIdFromEmail(ownerEmail);
  await db
    .collection(COLLECTIONS.brandIntelligence)
    .doc(id)
    .set(
      {
        competitors: [...profile.competitors, competitor],
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return {
    profile: await getBrandIntelligence(ownerEmail),
    competitor,
  };
}

export async function updateCompetitor(
  ownerEmail: string,
  competitorId: string,
  patch: Partial<Competitor>,
): Promise<BrandIntelligenceProfile> {
  const profile = await getBrandIntelligence(ownerEmail);
  const competitors = profile.competitors.map((item) =>
    item.id === competitorId
      ? {
          ...item,
          ...patch,
          id: item.id,
          updatedAt: new Date().toISOString(),
        }
      : item,
  );

  const db = getAdminDb();
  await db
    .collection(COLLECTIONS.brandIntelligence)
    .doc(userDocIdFromEmail(ownerEmail))
    .set(
      {
        competitors,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return getBrandIntelligence(ownerEmail);
}

export async function removeCompetitor(
  ownerEmail: string,
  competitorId: string,
): Promise<BrandIntelligenceProfile> {
  const profile = await getBrandIntelligence(ownerEmail);
  const target = profile.competitors.find((c) => c.id === competitorId);
  if (target) {
    const storagePaths = target.posts
      .map((p) => p.storagePath)
      .filter((p): p is string => Boolean(p));
    await deleteStoragePathsQuietly(storagePaths);
  }

  const competitors = profile.competitors.filter((c) => c.id !== competitorId);
  const db = getAdminDb();
  await db
    .collection(COLLECTIONS.brandIntelligence)
    .doc(userDocIdFromEmail(ownerEmail))
    .set(
      {
        competitors,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return getBrandIntelligence(ownerEmail);
}

export async function uploadBrandIntelligenceBytes(params: {
  ownerEmail: string;
  folder: "trust" | "historical" | "competitors";
  bytes: Buffer;
  contentType: string;
  fileName: string;
}): Promise<{ storagePath: string; mediaUrl: string }> {
  const storage = getAdminStorage();
  const bucket = storage.bucket(getAdminStorageBucketName());
  const userId = userDocIdFromEmail(params.ownerEmail);
  const extension = path.extname(params.fileName) || ".bin";
  const objectPath = `brand-intelligence/${userId}/${params.folder}/${Date.now()}-${randomUUID()}${extension}`;
  await bucket.file(objectPath).save(params.bytes, {
    metadata: { contentType: params.contentType || "application/octet-stream" },
    resumable: false,
  });
  return {
    storagePath: objectPath,
    mediaUrl: publicGcsUrl(objectPath),
  };
}

export async function addTrustProof(
  ownerEmail: string,
  proof: Omit<TrustProof, "id" | "createdAt"> & { id?: string },
): Promise<BrandIntelligenceProfile> {
  const profile = await ensureBrandIntelligence(ownerEmail);
  if (profile.trustProofs.length >= MAX_TRUST_PROOFS) {
    throw new Error("MAX_TRUST_PROOFS");
  }

  const next: TrustProof = {
    id: proof.id ?? randomUUID(),
    fileName: proof.fileName,
    contentType: proof.contentType,
    storagePath: proof.storagePath,
    mediaUrl: proof.mediaUrl,
    sizeBytes: proof.sizeBytes,
    extractedText: proof.extractedText ?? null,
    createdAt: new Date().toISOString(),
  };

  const db = getAdminDb();
  await db
    .collection(COLLECTIONS.brandIntelligence)
    .doc(userDocIdFromEmail(ownerEmail))
    .set(
      {
        trustProofs: [...profile.trustProofs, next],
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return getBrandIntelligence(ownerEmail);
}

export async function removeTrustProof(
  ownerEmail: string,
  proofId: string,
): Promise<BrandIntelligenceProfile> {
  const profile = await getBrandIntelligence(ownerEmail);
  const target = profile.trustProofs.find((p) => p.id === proofId);
  if (target?.storagePath) {
    await deleteStoragePathsQuietly([target.storagePath]);
  }

  const trustProofs = profile.trustProofs.filter((p) => p.id !== proofId);
  const db = getAdminDb();
  await db
    .collection(COLLECTIONS.brandIntelligence)
    .doc(userDocIdFromEmail(ownerEmail))
    .set(
      {
        trustProofs,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return getBrandIntelligence(ownerEmail);
}

export async function addHistoricalMedia(
  ownerEmail: string,
  items: Array<{
    source: HistoricalMediaSource;
    storagePath: string;
    mediaUrl: string;
    contentType: string;
    fileName?: string | null;
  }>,
): Promise<BrandIntelligenceProfile> {
  const profile = await ensureBrandIntelligence(ownerEmail);
  const remaining = MAX_HISTORICAL_MEDIA - profile.brandAccount.historicalMedia.length;
  if (remaining <= 0) throw new Error("MAX_HISTORICAL_MEDIA");

  const toAdd = items.slice(0, remaining).map((item) => ({
    id: randomUUID(),
    source: item.source,
    storagePath: item.storagePath,
    mediaUrl: item.mediaUrl,
    contentType: item.contentType,
    fileName: item.fileName ?? null,
    createdAt: new Date().toISOString(),
  }));

  const historicalMedia = [
    ...profile.brandAccount.historicalMedia,
    ...toAdd,
  ].slice(0, MAX_HISTORICAL_MEDIA);

  const db = getAdminDb();
  await db
    .collection(COLLECTIONS.brandIntelligence)
    .doc(userDocIdFromEmail(ownerEmail))
    .set(
      {
        "brandAccount.historicalMedia": historicalMedia,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return getBrandIntelligence(ownerEmail);
}

export async function removeHistoricalMedia(
  ownerEmail: string,
  mediaId: string,
): Promise<BrandIntelligenceProfile> {
  const profile = await getBrandIntelligence(ownerEmail);
  const target = profile.brandAccount.historicalMedia.find((m) => m.id === mediaId);
  if (target?.storagePath) {
    await deleteStoragePathsQuietly([target.storagePath]);
  }

  const historicalMedia = profile.brandAccount.historicalMedia.filter(
    (m) => m.id !== mediaId,
  );
  const db = getAdminDb();
  await db
    .collection(COLLECTIONS.brandIntelligence)
    .doc(userDocIdFromEmail(ownerEmail))
    .set(
      {
        "brandAccount.historicalMedia": historicalMedia,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return getBrandIntelligence(ownerEmail);
}

export async function syncBrandAccountInstagram(
  ownerEmail: string,
  instagram: {
    connected: boolean;
    username: string | null;
    igUserId: string | null;
  },
): Promise<BrandIntelligenceProfile> {
  await ensureBrandIntelligence(ownerEmail);
  const db = getAdminDb();
  await db
    .collection(COLLECTIONS.brandIntelligence)
    .doc(userDocIdFromEmail(ownerEmail))
    .set(
      {
        "brandAccount.instagram": instagram,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  return getBrandIntelligence(ownerEmail);
}

export async function getUserIntegrations(
  ownerEmail: string,
): Promise<UserIntegrations> {
  const db = getAdminDb();
  const id = userDocIdFromEmail(ownerEmail);
  const snap = await db.collection(COLLECTIONS.integrations).doc(id).get();
  if (!snap.exists) {
    return {
      id,
      ownerEmail,
      instagram: emptyInstagramIntegration(),
      createdAt: null,
      updatedAt: null,
    };
  }
  return mapIntegrations(id, ownerEmail, snap.data() as Record<string, unknown>);
}

export async function saveInstagramIntegration(
  ownerEmail: string,
  instagram: Omit<InstagramIntegration, "updatedAt"> & { updatedAt?: string | null },
): Promise<UserIntegrations> {
  const db = getAdminDb();
  const id = userDocIdFromEmail(ownerEmail);
  const ref = db.collection(COLLECTIONS.integrations).doc(id);
  const nowIso = new Date().toISOString();
  await ref.set(
    {
      id,
      ownerEmail,
      instagram: {
        ...instagram,
        updatedAt: nowIso,
      },
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await syncBrandAccountInstagram(ownerEmail, {
    connected: instagram.connected,
    username: instagram.username,
    igUserId: instagram.igUserId,
  });

  return getUserIntegrations(ownerEmail);
}

export async function disconnectInstagramIntegration(
  ownerEmail: string,
): Promise<UserIntegrations> {
  return saveInstagramIntegration(ownerEmail, {
    ...emptyInstagramIntegration(),
    connectedAt: null,
  });
}

async function deleteStoragePathsQuietly(paths: string[]) {
  if (paths.length === 0) return;
  try {
    const storage = getAdminStorage();
    const bucket = storage.bucket(getAdminStorageBucketName());
    await Promise.all(
      paths.map((p) => bucket.file(p).delete({ ignoreNotFound: true })),
    );
  } catch {
    // best-effort cleanup
  }
}

export function toPublicBrandIntelligence(
  profile: BrandIntelligenceProfile,
  options?: { instagramConnected?: boolean },
) {
  const withIg =
    options?.instagramConnected && !profile.brandAccount.instagram.connected
      ? {
          ...profile,
          brandAccount: {
            ...profile.brandAccount,
            instagram: {
              ...profile.brandAccount.instagram,
              connected: true,
            },
          },
        }
      : profile;

  return {
    ...withIg,
    completion: computeCompletion(withIg, options),
  };
}

export async function getPublicBrandIntelligence(ownerEmail: string) {
  const [profile, integrations] = await Promise.all([
    getBrandIntelligence(ownerEmail),
    getUserIntegrations(ownerEmail),
  ]);
  return toPublicBrandIntelligence(profile, {
    instagramConnected: integrations.instagram.connected,
  });
}

export function toPublicIntegrations(integrations: UserIntegrations) {
  return {
    id: integrations.id,
    ownerEmail: integrations.ownerEmail,
    instagram: {
      connected: integrations.instagram.connected,
      username: integrations.instagram.username,
      igUserId: integrations.instagram.igUserId,
      scopes: integrations.instagram.scopes,
      connectedAt: integrations.instagram.connectedAt,
      updatedAt: integrations.instagram.updatedAt,
      configured: isMetaOAuthConfigured(),
    },
    createdAt: integrations.createdAt,
    updatedAt: integrations.updatedAt,
  };
}

/** Instagram Login (Instagram App ID/Secret) — META_* geriye dönük uyumluluk. */
export function isInstagramOAuthConfigured(): boolean {
  const appId =
    process.env.INSTAGRAM_APP_ID?.trim() || process.env.META_APP_ID?.trim();
  const appSecret =
    process.env.INSTAGRAM_APP_SECRET?.trim() ||
    process.env.META_APP_SECRET?.trim();
  const redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI?.trim() ||
    process.env.META_REDIRECT_URI?.trim();
  return Boolean(appId && appSecret && redirectUri);
}

/** @deprecated Use isInstagramOAuthConfigured */
export function isMetaOAuthConfigured(): boolean {
  return isInstagramOAuthConfigured();
}

export function serializeBrandIntelligenceContext(
  profile: BrandIntelligenceProfile,
): string | undefined {
  // UI tamamlanma 0 iken strategic moda / context'e düşme:
  // örn. 1–5 historical media tek başına completion'a yazılmaz ama eskiden serialize ediliyordu.
  if (computeCompletion(profile).score <= 0) {
    return undefined;
  }

  const sections: string[] = [];

  if (profile.brandPromise.trim()) {
    sections.push(`Brand Promise:\n${profile.brandPromise.trim()}`);
  }

  const readyCompetitors = profile.competitors.filter((c) => c.status === "ready");
  if (readyCompetitors.length > 0) {
    const lines = readyCompetitors.map((c) => {
      const captions = c.posts
        .map((p) => p.caption?.trim())
        .filter(Boolean)
        .slice(0, 3)
        .join(" | ");
      return `- ${c.input} (${c.type})${c.summary ? `: ${c.summary}` : ""}${
        captions ? ` Captions: ${captions}` : ""
      }`;
    });
    sections.push(`Competitors (for differentiation):\n${lines.join("\n")}`);
  }

  const hist = profile.brandAccount.historicalMedia;
  if (hist.length > 0 || profile.brandAccount.instagram.connected) {
    const ig = profile.brandAccount.instagram;
    sections.push(
      [
        "Brand Historical Content:",
        ig.connected && ig.username ? `- Instagram connected: @${ig.username}` : null,
        profile.brandAccount.websiteUrl
          ? `- Website: ${profile.brandAccount.websiteUrl}`
          : null,
        `- Stored historical media count: ${hist.length}`,
        hist.length
          ? `- Sources: ${[...new Set(hist.map((h) => h.source))].join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (profile.trustProofs.length > 0) {
    const lines = profile.trustProofs.map((p) => {
      const excerpt = p.extractedText?.trim().slice(0, 280);
      return `- ${p.fileName} (${p.contentType})${excerpt ? `: ${excerpt}` : ""}`;
    });
    sections.push(`Trust Proofs:\n${lines.join("\n")}`);
  }

  if (sections.length === 0) return undefined;
  const serialized = `Strategic Brand Intelligence:\n\n${sections.join("\n\n")}`;
  // Keep vision prompts lean; long dumps increase timeout risk.
  return serialized.length > 3500
    ? `${serialized.slice(0, 3500)}\n…(truncated)`
    : serialized;
}
