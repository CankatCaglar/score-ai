/** Safe in-dashboard return navigation via `?returnTo=`. */

const ROUTE_LABELS: Array<{ prefix: string; label: string }> = [
  { prefix: "/dashboard/brand-brain", label: "Brand DNA" },
  { prefix: "/dashboard/benchmark", label: "Benchmark" },
  { prefix: "/dashboard/creative-memory", label: "Creative Memory" },
  { prefix: "/dashboard/analiz-sonucu", label: "Analiz Sonucu" },
  { prefix: "/dashboard/analizler", label: "Analizler" },
  { prefix: "/dashboard/yeni-analiz", label: "Yeni Analiz" },
  { prefix: "/dashboard/ayarlar", label: "Ayarlar" },
  { prefix: "/dashboard", label: "Genel Bakış" },
];

export type DashboardReturnTarget = {
  href: string;
  label: string;
};

/** Only allow same-origin dashboard relative paths (open-redirect safe). */
export function parseReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let path = raw.trim();
  if (!path) return null;

  try {
    if (/^https?:\/\//i.test(path)) {
      const url = new URL(path);
      path = `${url.pathname}${url.search}`;
    }
  } catch {
    return null;
  }

  if (!path.startsWith("/dashboard")) return null;
  if (path.startsWith("//") || path.includes("..")) return null;
  // Strip nested returnTo to avoid loops / oversized URLs.
  try {
    const url = new URL(path, "http://local.invalid");
    url.searchParams.delete("returnTo");
    path = `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
  return path || null;
}

export function labelForDashboardPath(path: string): string {
  const pathname = path.split("?")[0] || path;
  const match = ROUTE_LABELS.find(
    (item) =>
      pathname === item.prefix || pathname.startsWith(`${item.prefix}/`),
  );
  return match?.label ?? "Geri";
}

export function resolveReturnTarget(
  raw: string | null | undefined,
): DashboardReturnTarget | null {
  const href = parseReturnTo(raw);
  if (!href) return null;
  return { href, label: labelForDashboardPath(href) };
}

/** Append `returnTo` for cross-page CTAs (e.g. Brand DNA → Yeni Analiz). */
export function withReturnTo(href: string, returnTo: string): string {
  const safeReturn = parseReturnTo(returnTo);
  if (!safeReturn) return href;

  try {
    const url = new URL(href, "http://local.invalid");
    if (!url.pathname.startsWith("/dashboard")) return href;
    // Don't bounce back to the same page.
    if (url.pathname === safeReturn.split("?")[0]) return href;
    url.searchParams.set("returnTo", safeReturn);
    return `${url.pathname}${url.search}`;
  } catch {
    return href;
  }
}
