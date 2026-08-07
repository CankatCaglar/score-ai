import type { AppLocale } from "@/i18n/routing";

/** Locale-aware absolute path for hard navigations (always open at top). */
export function legalPageHref(
  page: "privacy" | "terms",
  locale: string,
): string {
  const isEn = locale === "en";
  if (page === "privacy") {
    return isEn ? "/en/privacy" : "/gizlilik-politikasi";
  }
  return isEn ? "/en/terms" : "/kullanim-kosullari";
}

export function isLegalPathname(href: string): href is "/privacy" | "/terms" {
  return href === "/privacy" || href === "/terms";
}

export function otherLocale(locale: string): AppLocale {
  return locale === "en" ? "tr" : "en";
}
