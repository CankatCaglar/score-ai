"use server";

import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import {
  USER_COOKIE_NAME,
  USER_SESSION_TTL_REMEMBER_SECONDS,
  USER_SESSION_TTL_SECONDS,
  USER_SESSION_TTL_SHORT_SECONDS,
  createUserSessionToken,
  verifyUserSessionToken,
  type UserSession,
} from "@/lib/user-auth";
import {
  composeDisplayName,
  normalizeProfileLanguage,
  splitDisplayName,
  userDocIdFromEmail,
} from "@/lib/user-profile";
import {
  LOCALE_COOKIE_NAME,
  localeCookieOptions,
} from "@/lib/i18n/locale-cookie";
import { claimGuestAnalysesForUser } from "@/lib/grader/claim";
import {
  ensureUserCreditsDefaults,
  getAnalysisCredits,
} from "@/lib/analysis/credits";
import {
  GRADER_LOCK_COOKIE_NAME,
  GRADER_LOCK_TTL_SECONDS,
  createGraderLockToken,
} from "@/lib/grader-auth";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function upsertUserDoc(input: {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  emailVerified: boolean;
  provider?: string | null;
}): Promise<{ displayName: string; photoURL: string | null; language: string }> {
  const db = getAdminDb();
  const email = normalizeEmail(input.email);
  const userId = userDocIdFromEmail(email);
  const ref = db.collection("users").doc(userId);
  const existing = await ref.get();
  const data = existing.data();

  if (!existing.exists) {
    const split = splitDisplayName(input.displayName);
    const displayName =
      composeDisplayName(split.firstName, split.lastName) ||
      input.displayName?.trim() ||
      email.split("@")[0] ||
      "Kullanıcı";

    await ref.set({
      id: userId,
      uid: input.uid,
      email,
      firstName: split.firstName,
      lastName: split.lastName,
      displayName,
      company: "",
      sector: "",
      language: "tr",
      timezone: "",
      country: "",
      photoURL: input.photoURL ?? null,
      emailVerified: input.emailVerified,
      provider: input.provider ?? null,
      freeAnalysesRemaining: 1,
      analysesUsed: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { displayName, photoURL: input.photoURL ?? null, language: "tr" };
  }

  const patch: Record<string, unknown> = {
    uid: input.uid,
    email,
    emailVerified: input.emailVerified,
    provider: input.provider ?? data?.provider ?? null,
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Fotoğraf yalnızca kullanıcıda yoksa Auth'tan doldurulur; profil alanları ezilmez.
  if (!data?.photoURL && input.photoURL) {
    patch.photoURL = input.photoURL;
  }

  await ref.set(patch, { merge: true });

  const firstName =
    typeof data?.firstName === "string" ? data.firstName.trim() : "";
  const lastName =
    typeof data?.lastName === "string" ? data.lastName.trim() : "";
  // Firestore profile wins over Auth displayName (Google often resets to
  // the provider name on each login).
  const displayName =
    composeDisplayName(firstName, lastName) ||
    (typeof data?.displayName === "string" && data.displayName.trim()) ||
    input.displayName?.trim() ||
    email.split("@")[0] ||
    "Kullanıcı";

  const photoURL =
    (typeof data?.photoURL === "string" && data.photoURL) ||
    input.photoURL ||
    null;

  const language = normalizeProfileLanguage(
    typeof data?.language === "string" ? data.language : "",
  );

  // Keep Auth displayName aligned with the saved profile so ID tokens
  // don't keep serving the old Google name after Settings rename.
  if (displayName && displayName !== (input.displayName ?? "").trim()) {
    try {
      await getAdminAuth().updateUser(input.uid, { displayName });
    } catch (error) {
      console.error("[upsertUserDoc] auth displayName sync", error);
    }
  }

  return { displayName, photoURL, language };
}

export async function createUserSession(
  idToken: string,
  options?: { rememberMe?: boolean },
): Promise<{
  ok: boolean;
  error?: string;
  session?: UserSession;
  claim?: {
    claimed: boolean;
    transferred: number;
    primarySlug: string | null;
    primaryAnalysisId: string | null;
  };
}> {
  if (!idToken?.trim()) {
    return { ok: false, error: "MISSING_TOKEN" };
  }

  try {
    // checkRevoked=false: local/dev'de ekstra Admin Auth çağrısı flakiness yaratmasın.
    const decoded = await getAdminAuth().verifyIdToken(idToken, false);
    const email = decoded.email ? normalizeEmail(decoded.email) : "";
    if (!email) {
      return { ok: false, error: "EMAIL_REQUIRED" };
    }

    const provider =
      typeof decoded.firebase?.sign_in_provider === "string"
        ? decoded.firebase.sign_in_provider
        : null;

    const profile = await upsertUserDoc({
      uid: decoded.uid,
      email,
      displayName: decoded.name ?? null,
      photoURL: decoded.picture ?? null,
      emailVerified: Boolean(decoded.email_verified),
      provider,
    });

    const ttlSeconds = options?.rememberMe
      ? USER_SESSION_TTL_REMEMBER_SECONDS
      : USER_SESSION_TTL_SHORT_SECONDS;

    const token = createUserSessionToken({
      email,
      uid: decoded.uid,
      emailVerified: Boolean(decoded.email_verified),
      name: profile.displayName,
      picture: profile.photoURL,
      provider,
      ttlSeconds,
    });

    const cookieStore = await cookies();
    cookieStore.set(USER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ttlSeconds,
    });

    cookieStore.set(
      LOCALE_COOKIE_NAME,
      normalizeProfileLanguage(profile.language),
      localeCookieOptions(),
    );

    await ensureUserCreditsDefaults(email);
    const credits = await getAnalysisCredits(email);
    if (credits.freeAnalysesRemaining <= 0) {
      cookieStore.set(GRADER_LOCK_COOKIE_NAME, createGraderLockToken(email), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: GRADER_LOCK_TTL_SECONDS,
      });
    }

    let claim:
      | {
          claimed: boolean;
          transferred: number;
          primarySlug: string | null;
          primaryAnalysisId: string | null;
        }
      | undefined;
    try {
      claim = await claimGuestAnalysesForUser(email);
    } catch (claimError) {
      console.error("[createUserSession] claim guest analyses", claimError);
    }

    return {
      ok: true,
      session: {
        email,
        uid: decoded.uid,
        emailVerified: Boolean(decoded.email_verified),
        name: profile.displayName,
        picture: profile.photoURL ?? undefined,
        provider: provider ?? undefined,
      },
      claim,
    };
  } catch (error) {
    console.error("[createUserSession]", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("FIREBASE_ADMIN_NOT_CONFIGURED")) {
      return { ok: false, error: "FIREBASE_ADMIN_NOT_CONFIGURED" };
    }
    if (message.includes("USER_SESSION_SECRET")) {
      return { ok: false, error: "USER_SESSION_SECRET" };
    }
    return { ok: false, error: "INVALID_TOKEN" };
  }
}

export async function refreshUserSession(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const cookieStore = await cookies();
  const current = verifyUserSessionToken(
    cookieStore.get(USER_COOKIE_NAME)?.value,
  );
  if (!current) {
    return { ok: false, error: "NO_SESSION" };
  }

  try {
    const user = await getAdminAuth().getUser(current.uid);
    const email = user.email ? normalizeEmail(user.email) : current.email;
    const provider =
      user.providerData.find((p) => p.providerId)?.providerId ??
      current.provider ??
      null;

    const profile = await upsertUserDoc({
      uid: user.uid,
      email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      provider,
    });

    const token = createUserSessionToken({
      email,
      uid: user.uid,
      emailVerified: user.emailVerified,
      name: profile.displayName,
      picture: profile.photoURL,
      provider,
    });

    cookieStore.set(USER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: USER_SESSION_TTL_SECONDS,
    });

    cookieStore.set(
      LOCALE_COOKIE_NAME,
      normalizeProfileLanguage(profile.language),
      localeCookieOptions(),
    );

    return { ok: true };
  } catch {
    return { ok: false, error: "REFRESH_FAILED" };
  }
}

export async function logoutUser(): Promise<{ ok: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete(USER_COOKIE_NAME);
  return { ok: true };
}

export async function getCurrentUserSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  return verifyUserSessionToken(cookieStore.get(USER_COOKIE_NAME)?.value);
}
