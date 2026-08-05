"use server";

import { randomUUID } from "crypto";
import path from "path";
import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminAuth,
  getAdminDb,
  getAdminStorage,
  getAdminStorageBucketName,
} from "@/lib/firebase-admin";
import {
  USER_COOKIE_NAME,
  USER_SESSION_TTL_SECONDS,
  createUserSessionToken,
  verifyUserSessionToken,
} from "@/lib/user-auth";
import {
  PROFILE_COUNTRIES,
  PROFILE_LANGUAGES,
  normalizeProfileLanguage,
  PROFILE_SECTORS,
  PROFILE_TIMEZONES,
  composeDisplayName,
  splitDisplayName,
  userDocIdFromEmail,
  type UserProfile,
} from "@/lib/user-profile";
import {
  LOCALE_COOKIE_NAME,
  localeCookieOptions,
} from "@/lib/i18n/locale-cookie";

const ALLOWED_PHOTO_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function detectImageMimeType(
  bytes: Buffer,
  declaredType: string,
): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "image/gif";
  }

  const normalized = declaredType.toLowerCase().trim();
  if (normalized === "image/jpg") return "image/jpeg";
  if (ALLOWED_PHOTO_MIME_TYPES.has(normalized)) return normalized;
  return null;
}

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".jpg";
  }
}

async function resolvePublicPhotoUrl(
  objectPath: string,
): Promise<string> {
  const storage = getAdminStorage();
  const bucket = storage.bucket(getAdminStorageBucketName());
  const object = bucket.file(objectPath);

  try {
    await object.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
  } catch {
    const [signedUrl] = await object.getSignedUrl({
      action: "read",
      expires: "2099-12-31",
    });
    return signedUrl;
  }
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapUserDoc(
  email: string,
  data: Record<string, unknown> | undefined,
  fallback?: {
    emailVerified?: boolean;
    displayName?: string | null;
    photoURL?: string | null;
    provider?: string | null;
  },
): UserProfile {
  const fromAuth = splitDisplayName(fallback?.displayName);
  const storedFirst = asString(data?.firstName);
  const storedLast = asString(data?.lastName);
  // Prefer Firestore name fields over Auth/session — Auth (e.g. Google)
  // can still say "Jack" after the user renamed themselves in Settings.
  const firstName = storedFirst || fromAuth.firstName;
  const lastName = storedLast || fromAuth.lastName;
  const displayName =
    composeDisplayName(storedFirst, storedLast) ||
    asString(data?.displayName) ||
    composeDisplayName(firstName, lastName) ||
    (typeof fallback?.displayName === "string"
      ? fallback.displayName.trim()
      : "") ||
    email.split("@")[0] ||
    "Kullanıcı";

  return {
    email,
    emailVerified: Boolean(data?.emailVerified ?? fallback?.emailVerified),
    firstName,
    lastName,
    displayName,
    company: asString(data?.company),
    sector: asString(data?.sector),
    language: normalizeProfileLanguage(asString(data?.language)),
    timezone: asString(data?.timezone),
    country: asString(data?.country),
    photoURL:
      (typeof data?.photoURL === "string" && data.photoURL) ||
      fallback?.photoURL ||
      null,
    provider:
      (typeof data?.provider === "string" && data.provider) ||
      fallback?.provider ||
      null,
  };
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const session = verifyUserSessionToken(
    cookieStore.get(USER_COOKIE_NAME)?.value,
  );
  if (!session) return null;

  const email = normalizeEmail(session.email);
  const db = getAdminDb();
  const snap = await db.collection("users").doc(userDocIdFromEmail(email)).get();

  return mapUserDoc(email, snap.data() as Record<string, unknown> | undefined, {
    emailVerified: session.emailVerified,
    displayName: session.name,
    photoURL: session.picture,
    provider: session.provider,
  });
}

export type UpdateProfileInput = {
  firstName: string;
  lastName: string;
  company: string;
  sector: string;
  language: string;
  timezone: string;
  country: string;
};

function isAllowedOption(value: string, options: readonly string[]): boolean {
  return value === "" || options.includes(value);
}

export async function updateCurrentUserProfile(
  input: UpdateProfileInput,
): Promise<{ ok: boolean; error?: string; profile?: UserProfile }> {
  const cookieStore = await cookies();
  const session = verifyUserSessionToken(
    cookieStore.get(USER_COOKIE_NAME)?.value,
  );
  if (!session) {
    return { ok: false, error: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  }

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const company = input.company.trim();
  const sector = input.sector.trim();
  const language = normalizeProfileLanguage(input.language);
  const timezone = input.timezone.trim();
  const country = input.country.trim();

  if (!firstName) {
    return { ok: false, error: "Ad alanı zorunlu." };
  }
  if (!isAllowedOption(sector, PROFILE_SECTORS)) {
    return { ok: false, error: "Geçersiz sektör seçimi." };
  }
  if (!PROFILE_LANGUAGES.includes(language)) {
    return { ok: false, error: "Geçersiz dil seçimi." };
  }
  if (!isAllowedOption(timezone, PROFILE_TIMEZONES)) {
    return { ok: false, error: "Geçersiz saat dilimi." };
  }
  if (!isAllowedOption(country, PROFILE_COUNTRIES)) {
    return { ok: false, error: "Geçersiz ülke seçimi." };
  }

  const email = normalizeEmail(session.email);
  const displayName = composeDisplayName(firstName, lastName) || firstName;
  const db = getAdminDb();
  const ref = db.collection("users").doc(userDocIdFromEmail(email));

  await ref.set(
    {
      firstName,
      lastName,
      displayName,
      company,
      sector,
      language,
      timezone,
      country,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  try {
    await getAdminAuth().updateUser(session.uid, { displayName });
  } catch (error) {
    console.error("[updateCurrentUserProfile] auth displayName", error);
  }

  const snap = await ref.get();
  const profile = mapUserDoc(email, snap.data() as Record<string, unknown> | undefined, {
    emailVerified: session.emailVerified,
    displayName,
    photoURL: session.picture,
    provider: session.provider,
  });

  const token = createUserSessionToken({
    email,
    uid: session.uid,
    emailVerified: session.emailVerified,
    name: profile.displayName,
    picture: profile.photoURL,
    provider: session.provider,
  });

  cookieStore.set(USER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: USER_SESSION_TTL_SECONDS,
  });

  // Drive dashboard/auth UI locale (unprefixed routes) from profile language.
  cookieStore.set(LOCALE_COOKIE_NAME, language, localeCookieOptions());

  return { ok: true, profile };
}

export async function updateCurrentUserPhoto(
  formData: FormData,
): Promise<{ ok: boolean; error?: string; profile?: UserProfile }> {
  const cookieStore = await cookies();
  const session = verifyUserSessionToken(
    cookieStore.get(USER_COOKIE_NAME)?.value,
  );
  if (!session) {
    return { ok: false, error: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, error: "Geçerli bir görsel seçin." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Görsel en fazla 5 MB olabilir." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = detectImageMimeType(bytes, file.type || "");
  if (!mimeType) {
    return {
      ok: false,
      error: "Yalnızca PNG, JPEG, JPG, WEBP veya GIF yükleyebilirsiniz.",
    };
  }

  const email = normalizeEmail(session.email);
  const db = getAdminDb();
  const ref = db.collection("users").doc(userDocIdFromEmail(email));
  const existing = await ref.get();
  const existingData = existing.data() as Record<string, unknown> | undefined;
  const previousStoragePath =
    typeof existingData?.photoStoragePath === "string"
      ? existingData.photoStoragePath
      : null;

  const storage = getAdminStorage();
  const bucket = storage.bucket(getAdminStorageBucketName());
  const ext =
    extensionForMime(mimeType) ||
    path.extname(file.name).toLowerCase() ||
    ".jpg";
  const objectPath = `profile-photos/${userDocIdFromEmail(email)}/avatar-${Date.now()}-${randomUUID()}${ext}`;
  const object = bucket.file(objectPath);

  await object.save(bytes, {
    metadata: { contentType: mimeType },
    resumable: false,
  });

  const photoURL = await resolvePublicPhotoUrl(objectPath);

  await ref.set(
    {
      photoURL,
      photoStoragePath: objectPath,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (previousStoragePath && previousStoragePath !== objectPath) {
    try {
      await bucket.file(previousStoragePath).delete({ ignoreNotFound: true });
    } catch (error) {
      console.error("[updateCurrentUserPhoto] delete previous", error);
    }
  }

  try {
    await getAdminAuth().updateUser(session.uid, { photoURL });
  } catch (error) {
    console.error("[updateCurrentUserPhoto] auth photoURL", error);
  }

  const snap = await ref.get();
  const profile = mapUserDoc(
    email,
    snap.data() as Record<string, unknown> | undefined,
    {
      emailVerified: session.emailVerified,
      displayName: session.name,
      photoURL,
      provider: session.provider,
    },
  );

  const token = createUserSessionToken({
    email,
    uid: session.uid,
    emailVerified: session.emailVerified,
    name: profile.displayName,
    picture: profile.photoURL,
    provider: session.provider,
  });

  cookieStore.set(USER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: USER_SESSION_TTL_SECONDS,
  });

  return { ok: true, profile };
}
