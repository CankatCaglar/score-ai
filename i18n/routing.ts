import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "en"],
  defaultLocale: "tr",
  // TR at `/…`, EN at `/en/…`. Avoids the `/` → `/tr` hop that fails
  // "minimal page redirects" graders (HubSpot, etc.).
  localePrefix: "as-needed",
  // URL is the source of truth — no Accept-Language / cookie bounce on `/`.
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/analyzer": "/analyzer",
    "/analyzer/[slug]": "/analyzer/[slug]",
    "/blog": "/blog",
    "/blog/[slug]": "/blog/[slug]",
    "/privacy": {
      tr: "/gizlilik-politikasi",
      en: "/privacy",
    },
  },
});

export type AppLocale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;

/** Public home path for a locale under `localePrefix: "as-needed"`. */
export function localeHomePath(locale: AppLocale): "/" | "/en" {
  return locale === routing.defaultLocale ? "/" : "/en";
}
