/** Namespaces needed by public marketing routes under `app/[locale]`. */
const MARKETING_NAMESPACES = [
  "meta",
  "landing",
  "blog",
  "privacy",
  "terms",
  "shipping",
  "cookie",
  "liveSupport",
  "analyzer",
] as const;

/** Drop heavy dashboard/auth bundles from marketing locale remounts. */
export function pickMarketingMessages(
  messages: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const key of MARKETING_NAMESPACES) {
    if (key in messages) {
      next[key] = messages[key];
    }
  }
  return next;
}
