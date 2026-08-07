import type { AppLocale } from "@/i18n/routing";

export type LegalPageId = "privacy" | "terms" | "shipping";

/** Locale-aware absolute path for hard navigations (always open at top). */
export function legalPageHref(page: LegalPageId, locale: string): string {
  const isEn = locale === "en";
  if (page === "privacy") {
    return isEn ? "/en/privacy" : "/gizlilik-politikasi";
  }
  if (page === "shipping") {
    return isEn ? "/en/shipping" : "/teslimat-ve-iade";
  }
  return isEn ? "/en/terms" : "/kullanim-kosullari";
}

export function isLegalPathname(
  href: string,
): href is "/privacy" | "/terms" | "/shipping" {
  return href === "/privacy" || href === "/terms" || href === "/shipping";
}

export function otherLocale(locale: string): AppLocale {
  return locale === "en" ? "tr" : "en";
}
