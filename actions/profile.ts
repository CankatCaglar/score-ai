"use server";

import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import {
  USER_COOKIE_NAME,
  USER_SESSION_TTL_SECONDS,
  createUserSessionToken,
  verifyUserSessionToken,
} from "@/lib/user-auth";
import {
  PROFILE_COUNTRIES,
  PROFILE_LANGUAGES,
  PROFILE_SECTORS,
  PROFILE_TIMEZONES,
  composeDisplayName,
  splitDisplayName,
  userDocIdFromEmail,
  type UserProfile,
} from "@/lib/user-profile";

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
  const firstName = asString(data?.firstName) || fromAuth.firstName;
  const lastName = asString(data?.lastName) || fromAuth.lastName;
  const displayName =
    asString(data?.displayName) ||
    composeDisplayName(firstName, lastName) ||
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
    language: asString(data?.language),
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
  const language = input.language.trim();
  const timezone = input.timezone.trim();
  const country = input.country.trim();

  if (!firstName) {
    return { ok: false, error: "Ad alanı zorunlu." };
  }
  if (!isAllowedOption(sector, PROFILE_SECTORS)) {
    return { ok: false, error: "Geçersiz sektör seçimi." };
  }
  if (!isAllowedOption(language, PROFILE_LANGUAGES)) {
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

  return { ok: true, profile };
}
