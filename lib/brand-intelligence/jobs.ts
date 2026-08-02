import { randomUUID } from "node:crypto";
import {
  addHistoricalMedia,
  getBrandIntelligence,
  getUserIntegrations,
  updateCompetitor,
  uploadBrandIntelligenceBytes,
} from "@/lib/brand-intelligence/repository";
import {
  MAX_COMPETITOR_POSTS,
  MAX_HISTORICAL_MEDIA,
  type CompetitorPost,
} from "@/lib/brand-intelligence/types";
import {
  detectCompetitorType,
  downloadProfilePostMedia,
  extractWebsiteImageCandidates,
  fetchInstagramProfileRecentPosts,
} from "@/lib/instagram/profile-feed";
import {
  downloadImageBytes,
  extractInstagramHandle,
  normalizeIncomingSourceUrl,
} from "@/lib/instagram/resolve";
import { createAppNotification } from "@/lib/notifications/repository";

function buildCompetitorSummary(
  input: string,
  captions: Array<string | null>,
): string {
  const usable = captions
    .filter((c): c is string => Boolean(c?.trim()))
    .slice(0, MAX_COMPETITOR_POSTS);
  if (usable.length === 0) {
    return `${input} için son ${MAX_COMPETITOR_POSTS} paylaşım alındı; görsel odaklı farklılaşma sinyali.`;
  }
  return `${input} son ${usable.length} içerik temaları: ${usable
    .map((c) => c.slice(0, 80))
    .join(" · ")}`;
}

export async function processCompetitorFetch(
  ownerEmail: string,
  competitorId: string,
): Promise<void> {
  const profile = await getBrandIntelligence(ownerEmail);
  const competitor = profile.competitors.find((c) => c.id === competitorId);
  if (!competitor) return;

  await updateCompetitor(ownerEmail, competitorId, {
    status: "pending",
    errorMessage: null,
  });

  try {
    const type =
      competitor.type || detectCompetitorType(competitor.input);

    if (type === "instagram") {
      const feed = await fetchInstagramProfileRecentPosts(
        competitor.input,
        MAX_COMPETITOR_POSTS,
      );
      const posts: CompetitorPost[] = [];

      for (const item of feed.slice(0, MAX_COMPETITOR_POSTS)) {
        try {
          const media = await downloadProfilePostMedia(item);
          const uploaded = await uploadBrandIntelligenceBytes({
            ownerEmail,
            folder: "competitors",
            bytes: media.bytes,
            contentType: media.mimeType,
            fileName: media.originalFileName,
          });
          posts.push({
            id: item.id,
            url: item.url,
            storagePath: uploaded.storagePath,
            mediaUrl: uploaded.mediaUrl,
            caption: item.caption,
            fetchedAt: new Date().toISOString(),
          });
        } catch {
          posts.push({
            id: item.id,
            url: item.url,
            storagePath: null,
            mediaUrl: null,
            caption: item.caption,
            fetchedAt: new Date().toISOString(),
          });
        }
      }

      if (posts.length === 0) {
        throw new Error("NO_POSTS_DOWNLOADED");
      }

      await updateCompetitor(ownerEmail, competitorId, {
        type: "instagram",
        status: "ready",
        posts,
        summary: buildCompetitorSummary(
          competitor.input,
          posts.map((p) => p.caption),
        ),
        errorMessage: null,
      });
      return;
    }

    // Website competitor: capture homepage imagery as proxy for recent presence
    const images = await extractWebsiteImageCandidates(
      competitor.input,
      MAX_COMPETITOR_POSTS,
    );
    const posts: CompetitorPost[] = [];
    for (const imageUrl of images) {
      try {
        const media = await downloadImageBytes(imageUrl);
        const uploaded = await uploadBrandIntelligenceBytes({
          ownerEmail,
          folder: "competitors",
          bytes: media.bytes,
          contentType: media.mimeType,
          fileName: media.originalFileName,
        });
        posts.push({
          id: randomUUID(),
          url: normalizeIncomingSourceUrl(competitor.input),
          storagePath: uploaded.storagePath,
          mediaUrl: uploaded.mediaUrl,
          caption: null,
          fetchedAt: new Date().toISOString(),
        });
      } catch {
        // skip broken image
      }
    }

    if (posts.length === 0) {
      throw new Error("NO_WEBSITE_IMAGES");
    }

    await updateCompetitor(ownerEmail, competitorId, {
      type: "website",
      status: "ready",
      posts,
      summary: `${competitor.input} web sitesinden ${posts.length} görsel sinyali alındı.`,
      errorMessage: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "COMPETITOR_FETCH_FAILED";
    await updateCompetitor(ownerEmail, competitorId, {
      status: "failed",
      posts: [],
      summary: null,
      errorMessage: message,
    });

    try {
      const label = competitor.input?.trim() || "Rakip";
      await createAppNotification({
        ownerEmail,
        type: "general",
        title: "Rakip çekimi başarısız",
        body: `"${label}" verileri alınamadı. Lütfen tekrar deneyin.`,
        href: "/dashboard/benchmark",
      });
    } catch (notifyError) {
      console.warn(
        "[competitor-fetch-notify] unexpected error",
        notifyError instanceof Error ? notifyError.message : notifyError,
      );
    }
  }
}

export async function syncInstagramHistoricalMedia(
  ownerEmail: string,
): Promise<number> {
  const integrations = await getUserIntegrations(ownerEmail);
  const ig = integrations.instagram;
  if (!ig.connected || !ig.accessToken || !ig.igUserId) {
    return 0;
  }

  // Instagram Login token → graph.instagram.com (Facebook Page token değil)
  const endpoint = new URL(
    `https://graph.instagram.com/v21.0/${ig.igUserId}/media`,
  );
  endpoint.searchParams.set(
    "fields",
    "id,caption,media_url,thumbnail_url,permalink,timestamp,media_type",
  );
  endpoint.searchParams.set("limit", String(MAX_HISTORICAL_MEDIA));
  endpoint.searchParams.set("access_token", ig.accessToken);

  const response = await fetch(endpoint.toString(), { method: "GET" });
  if (!response.ok) {
    throw new Error(`IG_MEDIA_FETCH_FAILED_${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{
      id?: string;
      caption?: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink?: string;
      media_type?: string;
    }>;
  };

  const items = Array.isArray(payload.data)
    ? payload.data.slice(0, MAX_HISTORICAL_MEDIA)
    : [];
  let added = 0;

  for (const item of items) {
    if (added >= MAX_HISTORICAL_MEDIA) break;
    const type = (item.media_type ?? "IMAGE").toUpperCase();
    const imageUrl =
      type === "VIDEO" || type === "REELS"
        ? item.thumbnail_url || item.media_url
        : item.media_url || item.thumbnail_url;
    if (!imageUrl) continue;
    if (!/IMAGE|CAROUSEL|VIDEO|REELS/i.test(type)) continue;
    try {
      const media = await downloadImageBytes(imageUrl);
      const uploaded = await uploadBrandIntelligenceBytes({
        ownerEmail,
        folder: "historical",
        bytes: media.bytes,
        contentType: media.mimeType,
        fileName: media.originalFileName,
      });
      await addHistoricalMedia(ownerEmail, [
        {
          source: "instagram",
          storagePath: uploaded.storagePath,
          mediaUrl: uploaded.mediaUrl,
          contentType: media.mimeType,
          fileName: item.permalink ?? media.originalFileName,
        },
      ]);
      added += 1;
    } catch {
      // skip item — MAX_HISTORICAL_MEDIA may already be full
      if (added === 0) continue;
    }
  }

  return added;
}

/** OAuth yokken: public profil scrape ile son içerikleri historical media'ya yazar. */
export async function syncBrandHistoricalFromUsername(
  ownerEmail: string,
  username: string,
): Promise<number> {
  const handle = extractInstagramHandle(username);
  if (!handle) return 0;

  const feed = await fetchInstagramProfileRecentPosts(handle, MAX_HISTORICAL_MEDIA);
  let added = 0;
  for (const item of feed) {
    try {
      const media = await downloadProfilePostMedia(item);
      const uploaded = await uploadBrandIntelligenceBytes({
        ownerEmail,
        folder: "historical",
        bytes: media.bytes,
        contentType: media.mimeType,
        fileName: media.originalFileName,
      });
      await addHistoricalMedia(ownerEmail, [
        {
          source: "instagram",
          storagePath: uploaded.storagePath,
          mediaUrl: uploaded.mediaUrl,
          contentType: media.mimeType,
          fileName: item.url,
        },
      ]);
      added += 1;
    } catch {
      // skip broken post
    }
  }
  return added;
}

export async function attachManualCompetitorPost(
  ownerEmail: string,
  competitorId: string,
  postUrl: string,
): Promise<void> {
  const profile = await getBrandIntelligence(ownerEmail);
  const competitor = profile.competitors.find((c) => c.id === competitorId);
  if (!competitor) throw new Error("COMPETITOR_NOT_FOUND");

  const normalized = normalizeIncomingSourceUrl(postUrl);
  const imageUrl = await (await import("@/lib/instagram/resolve")).resolveInstagramPostImageUrl(
    normalized,
  );
  if (!imageUrl) throw new Error("POST_IMAGE_UNRESOLVED");

  const media = await downloadImageBytes(imageUrl);
  const uploaded = await uploadBrandIntelligenceBytes({
    ownerEmail,
    folder: "competitors",
    bytes: media.bytes,
    contentType: media.mimeType,
    fileName: media.originalFileName,
  });

  const post: CompetitorPost = {
    id: randomUUID(),
    url: normalized,
    storagePath: uploaded.storagePath,
    mediaUrl: uploaded.mediaUrl,
    caption: null,
    fetchedAt: new Date().toISOString(),
  };

  const posts = [...competitor.posts, post].slice(0, MAX_COMPETITOR_POSTS);
  await updateCompetitor(ownerEmail, competitorId, {
    status: "ready",
    posts,
    summary: buildCompetitorSummary(
      competitor.input,
      posts.map((p) => p.caption),
    ),
    errorMessage: null,
  });
}

export function suggestHandleLabel(input: string): string {
  return extractInstagramHandle(input) ?? input.trim();
}
