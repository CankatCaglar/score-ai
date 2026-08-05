"use client";

type CacheEntry = {
  at: number;
  data: unknown;
};

const memory = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
/** Keep navigations instant across dashboard pages for a few minutes. */
const DEFAULT_TTL_MS = 5 * 60_000;

export function getDashboardCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > ttlMs) {
    memory.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setDashboardCache(key: string, data: unknown) {
  memory.set(key, { at: Date.now(), data });
}

export function invalidateDashboardCache(prefix?: string) {
  if (!prefix) {
    memory.clear();
    inflight.clear();
    return;
  }
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
}

function isPartialPayload(data: unknown): boolean {
  return Boolean(
    data &&
      typeof data === "object" &&
      "partial" in data &&
      (data as { partial?: boolean }).partial === true,
  );
}

/**
 * Fresh cache → no network.
 * Concurrent callers for the same key share one in-flight request.
 * Partial seeds still trigger a single full fetch.
 */
export async function fetchDashboardCached<T>(input: {
  key: string;
  url: string;
  ttlMs?: number;
  force?: boolean;
  onCache?: (data: T) => void;
}): Promise<T> {
  const ttl = input.ttlMs ?? DEFAULT_TTL_MS;
  const cached = getDashboardCache<T>(input.key, ttl);
  if (cached && input.onCache) {
    input.onCache(cached);
  }

  if (cached && !input.force && !isPartialPayload(cached)) {
    return cached;
  }

  const pending = inflight.get(input.key);
  if (pending) {
    const shared = (await pending) as T;
    if (input.onCache) input.onCache(shared);
    return shared;
  }

  const request = (async () => {
    const response = await fetch(input.url, { cache: "no-store" });
    if (!response.ok) {
      const stale = getDashboardCache<T>(input.key, ttl);
      if (stale && !isPartialPayload(stale)) return stale;
      throw new Error(`FETCH_FAILED:${response.status}`);
    }
    const data = (await response.json()) as T;
    setDashboardCache(input.key, data);
    return data;
  })();

  inflight.set(input.key, request);
  try {
    const data = await request;
    if (input.onCache) input.onCache(data);
    return data;
  } finally {
    inflight.delete(input.key);
  }
}

/** Warm cache for the next navigation (deduped with page fetches). */
export function prefetchDashboard(url: string, key = url) {
  if (typeof window === "undefined") return;
  void fetchDashboardCached({ key, url }).catch(() => undefined);
}

/** Shared by Creative Memory detail + Analizler detail (same API). */
export function analysisDetailCacheKey(slug: string, locale?: string) {
  const loc = locale === "en" || locale === "tr" ? locale : "tr";
  return `dashboard:analysis-detail:${loc}:${slug}`;
}

/** @deprecated use analysisDetailCacheKey */
export const creativeMemoryDetailCacheKey = analysisDetailCacheKey;

/** Seed list-row analysis so detail can paint instantly before full fetch. */
export function seedAnalysisDetail(
  analysis: {
    slug: string;
    [key: string]: unknown;
  },
  locale?: string,
) {
  if (!analysis.slug) return;
  const key = analysisDetailCacheKey(analysis.slug, locale);
  const existing = getDashboardCache<{ partial?: boolean }>(key);
  // Don't overwrite a full detail payload with a list row.
  if (existing && existing.partial === false) return;
  setDashboardCache(key, { analysis, partial: true });
}

/** @deprecated use seedAnalysisDetail */
export const seedCreativeMemoryDetail = seedAnalysisDetail;

export function prefetchAnalysisDetail(slug: string, locale?: string) {
  if (!slug || typeof window === "undefined") return;
  const loc = locale === "en" || locale === "tr" ? locale : "tr";
  const key = analysisDetailCacheKey(slug, loc);
  void fetchDashboardCached({
    key,
    url: `/api/dashboard/analyses/${encodeURIComponent(slug)}?locale=${loc}`,
  }).catch(() => undefined);
}

/** @deprecated use prefetchAnalysisDetail */
export const prefetchCreativeMemoryDetail = prefetchAnalysisDetail;

export function resultCacheKey(id: string, locale?: string) {
  const loc = locale === "en" || locale === "tr" ? locale : "tr";
  return `dashboard:result:${loc}:${id}`;
}

export function prefetchAnalysisResult(id: string, locale?: string) {
  if (!id || typeof window === "undefined") return;
  const loc = locale === "en" || locale === "tr" ? locale : "tr";
  void fetchDashboardCached({
    key: resultCacheKey(id, loc),
    url: `/api/dashboard/result?id=${encodeURIComponent(id)}&locale=${loc}`,
  }).catch(() => undefined);
}
