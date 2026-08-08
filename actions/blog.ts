"use server";

import { randomUUID } from "crypto";
import path from "path";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import {
  getAdminDb,
  getAdminStorage,
  getAdminStorageBucketName,
} from "@/lib/firebase-admin";

const ALLOWED_COVER_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const MAX_COVER_BYTES = 5 * 1024 * 1024;

function detectCoverMimeType(bytes: Buffer, declaredType: string): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  const normalized = declaredType.toLowerCase().trim();
  if (normalized === "image/jpg") return "image/jpeg";
  if (ALLOWED_COVER_MIME_TYPES.has(normalized)) return normalized;
  return null;
}

function extensionForCoverMime(mimeType: string): string {
  return mimeType === "image/png" ? ".png" : ".jpg";
}

async function resolvePublicCoverUrl(objectPath: string): Promise<string> {
  const storage = getAdminStorage();
  const bucket = storage.bucket(getAdminStorageBucketName());
  const object = bucket.file(objectPath);

  try {
    await object.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
  } catch {
    const [signedUrl] = await object.getSignedUrl({
      action: "read",
      expires: "2099-12-31",
    });
    return signedUrl;
  }
}

export type BlogLocale = "tr" | "en";
export type BlogStatus = "draft" | "published";
export type BlogLocalizedContent = {
  title: string;
  category: string;
  excerpt: string;
  content: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  locale: BlogLocale;
  category: string;
  author: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  status: BlogStatus;
  featured: boolean;
  readTime: string;
  translations: Record<BlogLocale, BlogLocalizedContent>;
  publishedAt: number | null;
  createdAt: number | null;
  updatedAt: number | null;
};

export type BlogPostInput = {
  id?: string;
  slug: string;
  title: string;
  locale: BlogLocale;
  category: string;
  author: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  featured: boolean;
  status: BlogStatus;
  publishAt?: number | null;
};

const COLLECTION = "blog_posts";

async function requireAdmin(): Promise<void> {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
}

function slugify(value: string): string {
  const map: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return value
    .trim()
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (ch) => map[ch] ?? ch)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function estimateReadTime(content: string, locale: BlogLocale): string {
  const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  const minutes = Math.max(1, Math.round(words / 200));
  return locale === "en" ? `${minutes} min` : `${minutes} dk`;
}

function toMillis(value: unknown): number | null {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

type BlogDocData = {
  slug?: string;
  title?: string;
  locale?: string;
  category?: string;
  author?: string;
  excerpt?: string;
  content?: string;
  coverImageUrl?: string;
  status?: string;
  featured?: boolean;
  readTime?: string;
  translations?: Partial<Record<BlogLocale, Partial<BlogLocalizedContent>>>;
  publishedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function mapDoc(id: string, data: BlogDocData): BlogPost {
  const sourceLocale: BlogLocale = data.locale === "en" ? "en" : "tr";
  const baseTitle = data.title ?? "";
  const baseCategory = data.category ?? "";
  const baseExcerpt = data.excerpt ?? "";
  const baseContent = data.content ?? "";
  const trFallback: BlogLocalizedContent = {
    title: sourceLocale === "tr" ? baseTitle : "",
    category: sourceLocale === "tr" ? baseCategory : "",
    excerpt: sourceLocale === "tr" ? baseExcerpt : "",
    content: sourceLocale === "tr" ? baseContent : "",
  };
  const enFallback: BlogLocalizedContent = {
    title: sourceLocale === "en" ? baseTitle : "",
    category: sourceLocale === "en" ? baseCategory : "",
    excerpt: sourceLocale === "en" ? baseExcerpt : "",
    content: sourceLocale === "en" ? baseContent : "",
  };
  const tr = {
    ...trFallback,
    ...(data.translations?.tr ?? {}),
  };
  const en = {
    ...enFallback,
    ...(data.translations?.en ?? {}),
  };

  return {
    id,
    slug: data.slug ?? id,
    title: baseTitle,
    locale: sourceLocale,
    category: baseCategory,
    author: data.author ?? "",
    excerpt: baseExcerpt,
    content: baseContent,
    coverImageUrl: data.coverImageUrl ?? "",
    status: data.status === "published" ? "published" : "draft",
    featured: Boolean(data.featured),
    readTime: data.readTime ?? "",
    translations: { tr, en },
    publishedAt: toMillis(data.publishedAt),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

function buildTranslations(input: {
  locale: BlogLocale;
  title: string;
  category: string;
  excerpt: string;
  content: string;
}): Record<BlogLocale, BlogLocalizedContent> {
  const sourceData: BlogLocalizedContent = {
    title: input.title,
    category: input.category,
    excerpt: input.excerpt,
    content: input.content,
  };
  const empty: BlogLocalizedContent = {
    title: "",
    category: "",
    excerpt: "",
    content: "",
  };

  return input.locale === "tr"
    ? { tr: sourceData, en: empty }
    : { en: sourceData, tr: empty };
}

/** Admin: tüm blog yazılarını (taslak + yayında) döndürür, güncelleme tarihine göre. */
export async function listBlogPosts(): Promise<BlogPost[]> {
  await requireAdmin();
  const db = getAdminDb();
  const snapshot = await db.collection(COLLECTION).get();
  return snapshot.docs
    .map((doc) => mapDoc(doc.id, doc.data() as BlogDocData))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

/** Admin: blog kapak görselini Storage'a yükler, public URL döner. */
export async function uploadBlogCoverImage(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  }

  const file = formData.get("cover");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, error: "Geçerli bir görsel seçin." };
  }
  if (file.size > MAX_COVER_BYTES) {
    return { ok: false, error: "Görsel en fazla 5 MB olabilir." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = detectCoverMimeType(bytes, file.type || "");
  if (!mimeType) {
    return { ok: false, error: "Yalnızca PNG, JPEG veya JPG yükleyebilirsiniz." };
  }

  const storage = getAdminStorage();
  const bucket = storage.bucket(getAdminStorageBucketName());
  const ext =
    extensionForCoverMime(mimeType) ||
    path.extname(file.name).toLowerCase() ||
    ".jpg";
  const objectPath = `blog-covers/${Date.now()}-${randomUUID()}${ext}`;
  const object = bucket.file(objectPath);

  await object.save(bytes, {
    metadata: { contentType: mimeType },
    resumable: false,
  });

  const url = await resolvePublicCoverUrl(objectPath);
  return { ok: true, url };
}

/** Admin: yazı oluşturur veya günceller. */
export async function saveBlogPost(
  input: BlogPostInput,
): Promise<{ ok: boolean; id: string }> {
  await requireAdmin();

  const title = input.title.trim();
  if (!title) throw new Error("TITLE_REQUIRED");

  const locale: BlogLocale = input.locale === "en" ? "en" : "tr";
  const slug = (input.slug.trim() ? slugify(input.slug) : slugify(title)) || slugify(title);
  const status: BlogStatus = input.status === "published" ? "published" : "draft";
  const sourceTitle = title;
  const sourceCategory = input.category.trim();
  const sourceExcerpt = input.excerpt.trim().slice(0, 300);
  const sourceContent = input.content;
  const translations = buildTranslations({
    locale,
    title: sourceTitle,
    category: sourceCategory,
    excerpt: sourceExcerpt,
    content: sourceContent,
  });
  const canonical = translations[locale];

  const db = getAdminDb();
  const now = FieldValue.serverTimestamp();

  const payload: Record<string, unknown> = {
    slug,
    title: canonical.title,
    locale,
    category: canonical.category,
    author: input.author.trim(),
    excerpt: canonical.excerpt,
    content: canonical.content,
    coverImageUrl: input.coverImageUrl.trim(),
    featured: Boolean(input.featured),
    status,
    readTime: estimateReadTime(canonical.content, locale),
    translations,
    updatedAt: now,
  };

  if (status === "published") {
    payload.publishedAt =
      typeof input.publishAt === "number"
        ? new Date(input.publishAt)
        : now;
  }

  if (input.id) {
    await db.collection(COLLECTION).doc(input.id).set(payload, { merge: true });
    return { ok: true, id: input.id };
  }

  payload.createdAt = now;
  const ref = await db.collection(COLLECTION).add(payload);
  return { ok: true, id: ref.id };
}

/** Admin: yayın durumunu değiştirir (yayınla / taslağa al). */
export async function setBlogPostStatus(
  id: string,
  status: BlogStatus,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!id) throw new Error("INVALID_ID");

  const db = getAdminDb();
  const payload: Record<string, unknown> = {
    status,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (status === "published") {
    payload.publishedAt = FieldValue.serverTimestamp();
  }
  await db.collection(COLLECTION).doc(id).set(payload, { merge: true });
  return { ok: true };
}

/** Admin: yazıyı siler. */
export async function deleteBlogPost(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!id) throw new Error("INVALID_ID");
  const db = getAdminDb();
  await db.collection(COLLECTION).doc(id).delete();
  return { ok: true };
}

async function fetchPublishedBlogPosts(): Promise<BlogPost[]> {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection(COLLECTION).get();
    const now = Date.now();
    return snapshot.docs
      .map((doc) => mapDoc(doc.id, doc.data() as BlogDocData))
      .filter((post) => post.status === "published")
      .filter((post) => (post.publishedAt ?? 0) <= now)
      .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
  } catch {
    return [];
  }
}

const getCachedPublishedBlogPosts = unstable_cache(
  fetchPublishedBlogPosts,
  ["blog-published-posts"],
  { revalidate: 60, tags: ["blog-posts"] },
);

/** Public: yayınlanmış yazıları döndürür (locale filtresi opsiyonel). */
export async function getPublishedBlogPosts(
  locale?: BlogLocale,
): Promise<BlogPost[]> {
  const posts = await getCachedPublishedBlogPosts();
  if (!locale) return posts;
  return posts.filter((post) => post.locale === locale);
}

async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection(COLLECTION)
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0]!;
    const post = mapDoc(doc.id, doc.data() as BlogDocData);
    if (post.status !== "published") return null;
    return post;
  } catch {
    return null;
  }
}

/** Public: slug ile tek yazı döndürür. */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  return unstable_cache(
    () => fetchBlogPostBySlug(slug),
    ["blog-post", slug],
    { revalidate: 60, tags: ["blog-posts", `blog-post-${slug}`] },
  )();
}
