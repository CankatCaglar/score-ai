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
  MAX_BRAND_DNA_AUDIENCE_NOTE,
  MAX_BRAND_DNA_AUDIENCES,
  MAX_BRAND_DNA_COLORS,
  MAX_BRAND_DNA_KEYWORDS,
  MAX_BRAND_DNA_PERSONALITY,
  MAX_BRAND_DNA_TONE,
  computeBrandDnaCompletion,
  emptyBrandDna,
  normalizeHexColor,
  resolveBrandDnaMode,
  type BrandDnaLogo,
  type BrandDnaProfile,
  type BrandDnaPublicProfile,
} from "@/lib/brand-dna/types";

const COLLECTIONS = {
  brandDna: "brand_dna",
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

function asStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || out.includes(trimmed)) continue;
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

function mapLogo(raw: unknown): BrandDnaLogo | null {
  if (!raw || typeof raw !== "object") return null;
  const logo = raw as Record<string, unknown>;
  const storagePath = typeof logo.storagePath === "string" ? logo.storagePath : "";
  const mediaUrl = typeof logo.mediaUrl === "string" ? logo.mediaUrl : "";
  if (!storagePath && !mediaUrl) return null;
  return {
    storagePath,
    mediaUrl: mediaUrl || (storagePath ? publicGcsUrl(storagePath) : ""),
    fileName: typeof logo.fileName === "string" ? logo.fileName : "logo",
    contentType:
      typeof logo.contentType === "string"
        ? logo.contentType
        : "application/octet-stream",
  };
}

function mapProfile(
  id: string,
  ownerEmail: string,
  data: Record<string, unknown>,
): BrandDnaProfile {
  const colors = asStringArray(data.colors, MAX_BRAND_DNA_COLORS)
    .map((c) => normalizeHexColor(c))
    .filter((c): c is string => Boolean(c));

  return {
    id,
    ownerEmail,
    logo: mapLogo(data.logo),
    colors,
    headingFont:
      typeof data.headingFont === "string" &&
      data.headingFont.trim() &&
      data.headingFont.trim() !== "-"
        ? data.headingFont.trim()
        : null,
    bodyFont:
      typeof data.bodyFont === "string" &&
      data.bodyFont.trim() &&
      data.bodyFont.trim() !== "-"
        ? data.bodyFont.trim()
        : null,
    personality: asStringArray(data.personality, MAX_BRAND_DNA_PERSONALITY),
    toneOfVoice: asStringArray(data.toneOfVoice, MAX_BRAND_DNA_TONE),
    audiences: asStringArray(data.audiences, MAX_BRAND_DNA_AUDIENCES),
    audienceNote:
      typeof data.audienceNote === "string"
        ? data.audienceNote.trim().slice(0, MAX_BRAND_DNA_AUDIENCE_NOTE)
        : "",
    sectorMain:
      typeof data.sectorMain === "string" && data.sectorMain.trim()
        ? data.sectorMain.trim()
        : null,
    sectorSub:
      typeof data.sectorSub === "string" && data.sectorSub.trim()
        ? data.sectorSub.trim()
        : null,
    keywords: asStringArray(data.keywords, MAX_BRAND_DNA_KEYWORDS),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export async function getBrandDna(ownerEmail: string): Promise<BrandDnaProfile> {
  const db = getAdminDb();
  const id = userDocIdFromEmail(ownerEmail);
  const snap = await db.collection(COLLECTIONS.brandDna).doc(id).get();
  if (!snap.exists) {
    return emptyBrandDna(ownerEmail, id);
  }
  return mapProfile(id, ownerEmail, snap.data() as Record<string, unknown>);
}

export async function ensureBrandDna(ownerEmail: string): Promise<BrandDnaProfile> {
  const db = getAdminDb();
  const id = userDocIdFromEmail(ownerEmail);
  const ref = db.collection(COLLECTIONS.brandDna).doc(id);
  const snap = await ref.get();
  if (snap.exists) {
    return mapProfile(id, ownerEmail, snap.data() as Record<string, unknown>);
  }
  const empty = emptyBrandDna(ownerEmail, id);
  await ref.set({
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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return empty;
}

export type BrandDnaUpdatePatch = {
  colors?: string[];
  headingFont?: string | null;
  bodyFont?: string | null;
  personality?: string[];
  toneOfVoice?: string[];
  audiences?: string[];
  audienceNote?: string;
  sectorMain?: string | null;
  sectorSub?: string | null;
  keywords?: string[];
};

export async function updateBrandDnaFields(
  ownerEmail: string,
  patch: BrandDnaUpdatePatch,
): Promise<BrandDnaProfile> {
  const db = getAdminDb();
  const id = userDocIdFromEmail(ownerEmail);
  const ref = db.collection(COLLECTIONS.brandDna).doc(id);
  await ensureBrandDna(ownerEmail);

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (patch.colors !== undefined) {
    const colors = patch.colors
      .map((c) => normalizeHexColor(c))
      .filter((c): c is string => Boolean(c))
      .slice(0, MAX_BRAND_DNA_COLORS);
    const unique = [...new Set(colors)];
    updates.colors = unique;
  }
  if (patch.headingFont !== undefined) {
    const raw =
      typeof patch.headingFont === "string" ? patch.headingFont.trim() : "";
    updates.headingFont = raw && raw !== "-" ? raw : null;
  }
  if (patch.bodyFont !== undefined) {
    const raw =
      typeof patch.bodyFont === "string" ? patch.bodyFont.trim() : "";
    updates.bodyFont = raw && raw !== "-" ? raw : null;
  }
  if (patch.personality !== undefined) {
    updates.personality = asStringArray(
      patch.personality,
      MAX_BRAND_DNA_PERSONALITY,
    );
  }
  if (patch.toneOfVoice !== undefined) {
    updates.toneOfVoice = asStringArray(patch.toneOfVoice, MAX_BRAND_DNA_TONE);
  }
  if (patch.audiences !== undefined) {
    updates.audiences = asStringArray(patch.audiences, MAX_BRAND_DNA_AUDIENCES);
  }
  if (patch.audienceNote !== undefined) {
    updates.audienceNote = String(patch.audienceNote ?? "")
      .trim()
      .slice(0, MAX_BRAND_DNA_AUDIENCE_NOTE);
  }
  if (patch.sectorMain !== undefined) {
    updates.sectorMain =
      typeof patch.sectorMain === "string" && patch.sectorMain.trim()
        ? patch.sectorMain.trim()
        : null;
  }
  if (patch.sectorSub !== undefined) {
    updates.sectorSub =
      typeof patch.sectorSub === "string" && patch.sectorSub.trim()
        ? patch.sectorSub.trim()
        : null;
  }
  if (patch.keywords !== undefined) {
    updates.keywords = asStringArray(patch.keywords, MAX_BRAND_DNA_KEYWORDS);
  }

  await ref.set(updates, { merge: true });
  return getBrandDna(ownerEmail);
}

export async function uploadBrandDnaLogoBytes(params: {
  ownerEmail: string;
  bytes: Buffer;
  contentType: string;
  fileName: string;
}): Promise<{ storagePath: string; mediaUrl: string }> {
  const storage = getAdminStorage();
  const bucket = storage.bucket(getAdminStorageBucketName());
  const userId = userDocIdFromEmail(params.ownerEmail);
  const extension = path.extname(params.fileName) || ".bin";
  const objectPath = `brand-dna/${userId}/logo/${Date.now()}-${randomUUID()}${extension}`;
  const file = bucket.file(objectPath);
  await file.save(params.bytes, {
    metadata: { contentType: params.contentType || "application/octet-stream" },
    resumable: false,
  });
  // Private bucket: signed URL for AI/context; UI preview uses auth proxy.
  let mediaUrl = publicGcsUrl(objectPath);
  try {
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: "2099-12-31",
    });
    mediaUrl = signedUrl;
  } catch {
    // keep public URL fallback
  }
  return {
    storagePath: objectPath,
    mediaUrl,
  };
}

export async function getBrandDnaLogoFile(
  ownerEmail: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const profile = await getBrandDna(ownerEmail);
  if (!profile.logo?.storagePath) return null;
  const storage = getAdminStorage();
  const bucket = storage.bucket(getAdminStorageBucketName());
  const file = bucket.file(profile.logo.storagePath);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [bytes] = await file.download();
  return {
    bytes,
    contentType: profile.logo.contentType || "application/octet-stream",
  };
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

export async function setBrandDnaLogo(
  ownerEmail: string,
  logo: BrandDnaLogo,
): Promise<BrandDnaProfile> {
  const profile = await ensureBrandDna(ownerEmail);
  const previousPath = profile.logo?.storagePath;
  const db = getAdminDb();
  const id = userDocIdFromEmail(ownerEmail);
  await db
    .collection(COLLECTIONS.brandDna)
    .doc(id)
    .set(
      {
        logo,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  if (previousPath && previousPath !== logo.storagePath) {
    await deleteStoragePathsQuietly([previousPath]);
  }
  return getBrandDna(ownerEmail);
}

export async function deleteBrandDnaLogo(
  ownerEmail: string,
): Promise<BrandDnaProfile> {
  const profile = await ensureBrandDna(ownerEmail);
  const previousPath = profile.logo?.storagePath;
  const db = getAdminDb();
  const id = userDocIdFromEmail(ownerEmail);
  await db
    .collection(COLLECTIONS.brandDna)
    .doc(id)
    .set(
      {
        logo: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  if (previousPath) {
    await deleteStoragePathsQuietly([previousPath]);
  }
  return getBrandDna(ownerEmail);
}

export function toPublicBrandDna(profile: BrandDnaProfile): BrandDnaPublicProfile {
  return {
    ...profile,
    completion: computeBrandDnaCompletion(profile),
  };
}

export async function getPublicBrandDna(
  ownerEmail: string,
): Promise<BrandDnaPublicProfile> {
  const profile = await getBrandDna(ownerEmail);
  return toPublicBrandDna(profile);
}

/** Serializes Brand DNA for analysis prompts. Returns undefined when empty. */
export function serializeBrandDnaContext(
  profile: BrandDnaProfile,
): string | undefined {
  const mode = resolveBrandDnaMode(profile);
  if (mode === "missing") return undefined;

  const sections: string[] = [`brand_dna_mode: ${mode}`];

  if (profile.logo?.storagePath || profile.logo?.mediaUrl) {
    // Don't embed signed GCS URLs — they bloat every vision call without helping.
    sections.push(
      `Logo:\nuploaded (${profile.logo.fileName || "logo"}; use visual_identity against brand colors/fonts)`,
    );
  }
  if (profile.colors.length > 0) {
    sections.push(`Colors:\n${profile.colors.join(", ")}`);
  }
  if (profile.headingFont || profile.bodyFont) {
    sections.push(
      `Typography:\nHeading: ${profile.headingFont ?? "—"}\nBody: ${profile.bodyFont ?? "—"}`,
    );
  }
  if (profile.personality.length > 0) {
    sections.push(`Personality:\n${profile.personality.join(", ")}`);
  }
  if (profile.toneOfVoice.length > 0) {
    sections.push(`Tone of Voice:\n${profile.toneOfVoice.join(", ")}`);
  }
  const audienceParts = [...profile.audiences];
  if (profile.audienceNote.trim()) {
    audienceParts.push(`Other: ${profile.audienceNote.trim()}`);
  }
  if (audienceParts.length > 0) {
    sections.push(`Target Audience:\n${audienceParts.join(", ")}`);
  }
  if (profile.sectorMain) {
    const sectorLine = profile.sectorSub
      ? `${profile.sectorMain} / ${profile.sectorSub}`
      : profile.sectorMain;
    sections.push(`Sector:\n${sectorLine}`);
  }
  if (profile.keywords.length > 0) {
    sections.push(`Brand Keywords:\n${profile.keywords.join(", ")}`);
  }

  // mode alone is not enough context; need at least one field section
  if (sections.length <= 1) return undefined;
  const serialized = sections.join("\n\n");
  // Keep vision prompts lean — long DNA dumps slow every brand call.
  return serialized.length > 1800
    ? `${serialized.slice(0, 1800)}\n…(truncated)`
    : serialized;
}

export function mergeBrandContexts(params: {
  dnaContext?: string | null;
  strategicContext?: string | null;
}): string | undefined {
  const parts: string[] = [];
  if (params.dnaContext?.trim()) {
    parts.push(`## Brand DNA\n${params.dnaContext.trim()}`);
  }
  if (params.strategicContext?.trim()) {
    parts.push(
      `## Strategic Brand Intelligence\n${params.strategicContext.trim()}`,
    );
  }
  if (parts.length === 0) return undefined;
  return parts.join("\n\n");
}
