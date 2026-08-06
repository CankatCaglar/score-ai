import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { routing, type AppLocale } from "./routing";

function isAppLocale(value: string | undefined | null): value is AppLocale {
  return value === "tr" || value === "en";
}

export default getRequestConfig(async ({ requestLocale }) => {
  // Prefer the `[locale]` segment / middleware negotiation. Cookie is a
  // fallback for unprefixed marketing routes and non-locale app routes
  // (dashboard/auth) when `localeDetection` is off.
  const requested = await requestLocale;
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  const locale: AppLocale = isAppLocale(requested)
    ? requested
    : isAppLocale(cookieLocale)
      ? cookieLocale
      : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
