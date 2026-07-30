import { randomUUID } from "node:crypto";
import {
  downloadImageBytes,
  extractImageCandidateFromHtml,
  extractInstagramHandle,
  INSTAGRAM_FETCH_HEADERS,
  normalizeIncomingSourceUrl,
  resolveInstagramPostImageUrl,
} from "@/lib/instagram/resolve";
import { MAX_COMPETITOR_POSTS } from "@/lib/brand-intelligence/types";

export type ProfileFeedPost = {
  id: string;
  url: string;
  shortcode: string;
  caption: string | null;
  imageUrl: string | null;
};

function decodeJsonString(value: string): string {
  return value
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function extractShortcodesFromHtml(html: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /"shortcode"\s*:\s*"([A-Za-z0-9_-]+)"/g,
    /\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/g,
    /"code"\s*:\s*"([A-Za-z0-9_-]+)"/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const code = match[1]?.trim();
      if (code && code.length >= 5) found.add(code);
      if (found.size >= MAX_COMPETITOR_POSTS * 3) break;
    }
  }
  return Array.from(found).slice(0, MAX_COMPETITOR_POSTS);
}

function extractCaptionNearShortcode(
  html: string,
  shortcode: string,
): string | null {
  const idx = html.indexOf(shortcode);
  if (idx < 0) return null;
  const window = html.slice(Math.max(0, idx - 400), idx + 1200);
  const captionMatch =
    window.match(/"text"\s*:\s*"((?:\\.|[^"\\])*)"/) ||
    window.match(/"caption"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (!captionMatch?.[1]) return null;
  try {
    return JSON.parse(`"${captionMatch[1]}"`) as string;
  } catch {
    return decodeJsonString(captionMatch[1]).slice(0, 400);
  }
}

async function fetchProfileHtml(username: string): Promise<string | null> {
  const endpoints = [
    `https://www.instagram.com/${username}/`,
    `https://www.instagram.com/${username}/?__a=1&__d=dis`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          ...INSTAGRAM_FETCH_HEADERS,
          accept: "text/html,application/json,application/xhtml+xml,*/*;q=0.8",
          "x-ig-app-id": "936619743392459",
        },
        redirect: "follow",
      });
      if (!response.ok) continue;
      const text = await response.text();
      if (text.trim()) return text;
    } catch {
      // try next
    }
  }
  return null;
}

export async function fetchInstagramProfileRecentPosts(
  input: string,
  limit = MAX_COMPETITOR_POSTS,
): Promise<ProfileFeedPost[]> {
  const username = extractInstagramHandle(input);
  if (!username) {
    throw new Error("INVALID_INSTAGRAM_HANDLE");
  }

  const html = await fetchProfileHtml(username);
  if (!html) {
    throw new Error("PROFILE_FETCH_FAILED");
  }

  const shortcodes = extractShortcodesFromHtml(html).slice(0, limit);
  if (shortcodes.length === 0) {
    throw new Error("NO_POSTS_FOUND");
  }

  const posts: ProfileFeedPost[] = [];
  for (const shortcode of shortcodes) {
    const url = `https://www.instagram.com/p/${shortcode}/`;
    let imageUrl: string | null = null;
    try {
      imageUrl = await resolveInstagramPostImageUrl(url);
    } catch {
      imageUrl = null;
    }
    posts.push({
      id: randomUUID(),
      url,
      shortcode,
      caption: extractCaptionNearShortcode(html, shortcode),
      imageUrl,
    });
  }

  return posts;
}

export async function downloadProfilePostMedia(post: ProfileFeedPost) {
  const imageUrl =
    post.imageUrl ?? (await resolveInstagramPostImageUrl(post.url));
  if (!imageUrl) {
    throw new Error("POST_IMAGE_UNRESOLVED");
  }
  const downloaded = await downloadImageBytes(imageUrl);
  return { ...downloaded, resolvedImageUrl: imageUrl };
}

export async function extractWebsiteImageCandidates(
  rawUrl: string,
  limit = 6,
): Promise<string[]> {
  const normalized = normalizeIncomingSourceUrl(rawUrl);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("INVALID_WEBSITE_URL");
  }
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error("INVALID_WEBSITE_URL");
  }

  const response = await fetch(parsed.toString(), {
    method: "GET",
    headers: INSTAGRAM_FETCH_HEADERS,
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`WEBSITE_FETCH_FAILED_${response.status}`);
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error("WEBSITE_NOT_HTML");
  }

  const html = await response.text();
  const found = new Set<string>();
  const og = extractImageCandidateFromHtml(html);
  if (og) {
    try {
      found.add(new URL(og, parsed.toString()).toString());
    } catch {
      // ignore
    }
  }

  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1]?.trim();
    if (!src || src.startsWith("data:")) continue;
    try {
      const absolute = new URL(src, parsed.toString()).toString();
      if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(absolute) || absolute.includes("image")) {
        found.add(absolute);
      }
    } catch {
      // ignore
    }
    if (found.size >= limit) break;
  }

  return Array.from(found).slice(0, limit);
}

export function detectCompetitorType(
  input: string,
): "instagram" | "website" {
  const trimmed = input.trim();
  if (/^@?[a-z0-9._]+$/i.test(trimmed) && !trimmed.includes("/")) {
    return "instagram";
  }
  try {
    const url = new URL(normalizeIncomingSourceUrl(trimmed));
    if (/(^|\.)instagram\.com$/i.test(url.hostname)) return "instagram";
    return "website";
  } catch {
    return "instagram";
  }
}
