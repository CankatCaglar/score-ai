import type { AppLocale } from "@/i18n/routing";

export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function localeCookieOptions() {
  return {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax" as const,
  };
}

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return value === "tr" || value === "en";
}
