import type { AppLocale } from "@/i18n/routing";
import enMessages from "@/messages/en.json";
import trMessages from "@/messages/tr.json";

export type AuthErrorKey = keyof typeof trMessages.auth.errors;

function resolveAuthErrorKey(error: unknown): AuthErrorKey {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message)
        : "";

  const key = code || message;

  switch (key) {
    case "auth/email-already-in-use":
      return "emailAlreadyInUse";
    case "auth/invalid-email":
      return "invalidEmail";
    case "auth/weak-password":
      return "weakPassword";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "wrongCredentials";
    case "auth/too-many-requests":
      return "tooManyRequests";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "popupClosed";
    case "auth/popup-blocked":
      return "popupBlocked";
    case "auth/unauthorized-domain":
      return "unauthorizedDomain";
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    case "auth/invalid-api-key":
      return "invalidApiKey";
    case "auth/operation-not-allowed":
      return "operationNotAllowed";
    case "auth/account-exists-with-different-credential":
      return "accountExistsDifferent";
    case "auth/network-request-failed":
      return "networkFailed";
    case "auth/requires-recent-login":
      return "requiresRecentLogin";
    case "auth/expired-action-code":
      return "expiredActionCode";
    case "auth/invalid-action-code":
      return "invalidActionCode";
    case "auth/user-disabled":
      return "userDisabled";
    case "INVALID_TOKEN":
    case "SESSION_FAILED":
      return "sessionFailed";
    case "USER_SESSION_SECRET":
      return "sessionSecret";
    case "EMAIL_REQUIRED":
      return "emailRequired";
    case "MISSING_TOKEN":
    case "NO_USER":
      return "authIncomplete";
    case "FIREBASE_ADMIN_NOT_CONFIGURED":
      return "adminNotConfigured";
    default:
      if (message.includes("USER_SESSION_SECRET")) return "sessionSecret";
      if (message.includes("FIREBASE_ADMIN")) return "firebaseAdminBad";
      return "generic";
  }
}

/** Firebase Auth / session hata kodlarını kullanıcı diline çevirir. */
export function mapAuthError(
  error: unknown,
  locale: AppLocale | string = "tr",
): string {
  const key = resolveAuthErrorKey(error);
  const dict =
    locale === "en" ? enMessages.auth.errors : trMessages.auth.errors;
  return dict[key] ?? dict.generic;
}

/** Kullanıcı hatası mı (form uyarısı) yoksa sistem hatası mı (toast) ayırır. */
export function isSoftAuthFeedback(message: string): boolean {
  return (
    message.includes("E-posta veya şifre") ||
    message.includes("Incorrect email or password") ||
    message.includes("Google ile kayıt") ||
    message.includes("signed up with Google") ||
    message.includes("e-posta adresi girin") ||
    message.includes("valid email") ||
    message.includes("en az 6 karakter") ||
    message.includes("at least 6 characters") ||
    message.includes("zaten kayıtlı") ||
    message.includes("already registered") ||
    message.includes("eşleşmiyor") ||
    message.includes("do not match")
  );
}

export function getAppOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
