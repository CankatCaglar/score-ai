"use client";

import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { createUserSession } from "@/actions/auth";
import { auth } from "@/lib/firebase";
import { getAppOrigin, mapAuthError } from "@/lib/auth/errors";
import type { AppLocale } from "@/i18n/routing";

function clientLocale(): AppLocale {
  if (typeof document === "undefined") return "tr";
  const fromCookie = document.cookie.match(
    /(?:^|;\s*)NEXT_LOCALE=(tr|en)(?:;|$)/,
  )?.[1];
  if (fromCookie === "tr" || fromCookie === "en") return fromCookie;
  return document.documentElement.lang?.toLowerCase().startsWith("en")
    ? "en"
    : "tr";
}

const googleProvider = new GoogleAuthProvider();

const EXPECTED_AUTH_CODES = new Set([
  "auth/invalid-credential",
  "auth/wrong-password",
  "auth/user-not-found",
  "auth/email-already-in-use",
  "auth/invalid-email",
  "auth/weak-password",
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/popup-blocked",
  "auth/account-exists-with-different-credential",
  "auth/too-many-requests",
]);

function authErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: string }).code ?? "");
  }
  return "";
}

function logUnexpectedAuthError(error: unknown) {
  const code = authErrorCode(error);
  if (EXPECTED_AUTH_CODES.has(code)) return;
  console.warn("[auth]", code || error);
}

async function establishSession(options?: { rememberMe?: boolean }) {
  const user = auth.currentUser;
  if (!user) {
    const err = new Error("NO_USER");
    (err as Error & { code: string }).code = "NO_USER";
    throw err;
  }
  const idToken = await user.getIdToken(true);
  const result = await createUserSession(idToken, {
    rememberMe: options?.rememberMe,
  });
  if (!result.ok) {
    const code = result.error ?? "SESSION_FAILED";
    const err = new Error(code);
    (err as Error & { code: string }).code = code;
    throw err;
  }
  return result.session!;
}

export async function signUpWithEmail(input: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      input.email.trim(),
      input.password,
    );
    const displayName = input.name.trim();
    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }

    const origin = getAppOrigin();
    await sendEmailVerification(credential.user, {
      url: `${origin}/email-dogrula`,
      handleCodeInApp: false,
    });

    await establishSession();
    return { ok: true as const, emailVerified: false };
  } catch (error) {
    logUnexpectedAuthError(error);
    return { ok: false as const, error: mapAuthError(error, clientLocale()) };
  }
}

export async function signInWithEmail(input: {
  email: string;
  password: string;
  rememberMe?: boolean;
}) {
  try {
    await signInWithEmailAndPassword(
      auth,
      input.email.trim(),
      input.password,
    );
    const session = await establishSession({ rememberMe: input.rememberMe });
    return {
      ok: true as const,
      emailVerified: session.emailVerified,
    };
  } catch (error) {
    logUnexpectedAuthError(error);
    return { ok: false as const, error: mapAuthError(error, clientLocale()) };
  }
}

export async function signInWithGoogle(options?: { rememberMe?: boolean }) {
  try {
    await signInWithPopup(auth, googleProvider);
    const session = await establishSession({ rememberMe: options?.rememberMe });
    return {
      ok: true as const,
      emailVerified: session.emailVerified,
    };
  } catch (error) {
    logUnexpectedAuthError(error);
    return { ok: false as const, error: mapAuthError(error, clientLocale()) };
  }
}

export async function resendVerificationEmail() {
  try {
    const user = auth.currentUser;
    if (!user) {
      return {
        ok: false as const,
        error: "Oturum bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }
    const origin = getAppOrigin();
    await sendEmailVerification(user, {
      url: `${origin}/email-dogrula`,
      handleCodeInApp: false,
    });
    return { ok: true as const };
  } catch (error) {
    logUnexpectedAuthError(error);
    return { ok: false as const, error: mapAuthError(error, clientLocale()) };
  }
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  try {
    const user = auth.currentUser;
    if (!user?.email) {
      return {
        ok: false as const,
        error: "Oturum bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const credential = EmailAuthProvider.credential(
      user.email,
      input.currentPassword,
    );
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, input.newPassword);
    return { ok: true as const };
  } catch (error) {
    logUnexpectedAuthError(error);
    return { ok: false as const, error: mapAuthError(error, clientLocale()) };
  }
}
