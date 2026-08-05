import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "en"],
  defaultLocale: "tr",
  localePrefix: "always",
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
