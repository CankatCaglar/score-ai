"use server";

import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase-admin";

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

async function translateText({
  source,
  target,
  text,
  format = "text",
}: {
  source: BlogLocale;
  target: BlogLocale;
  text: string;
  format?: "text" | "html";
}): Promise<string> {
  const clean = text.trim();
  if (!clean) return "";
  if (source === target) return clean;

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    return clean;
  }

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: clean,
        source,
        target,
        format,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return clean;
  }

  const data = (await response.json()) as {
    data?: { translations?: Array<{ translatedText?: string }> };
  };
  return data.data?.translations?.[0]?.translatedText?.trim() || clean;
}

async function buildTranslations(input: {
  locale: BlogLocale;
  title: string;
  category: string;
  excerpt: string;
  content: string;
}): Promise<Record<BlogLocale, BlogLocalizedContent>> {
  const source = input.locale;
  const target: BlogLocale = source === "tr" ? "en" : "tr";

  const [title, category, excerpt, content] = await Promise.all([
    translateText({ source, target, text: input.title }),
    translateText({ source, target, text: input.category }),
    translateText({ source, target, text: input.excerpt }),
    translateText({ source, target, text: input.content, format: "html" }),
  ]);

  const sourceData: BlogLocalizedContent = {
    title: input.title,
    category: input.category,
    excerpt: input.excerpt,
    content: input.content,
  };
  const targetData: BlogLocalizedContent = {
    title,
    category,
    excerpt: excerpt.slice(0, 300),
    content,
  };

  return source === "tr"
    ? { tr: sourceData, en: targetData }
    : { en: sourceData, tr: targetData };
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
  const translations = await buildTranslations({
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

/** Public: yayınlanmış yazıları döndürür (locale filtresi opsiyonel). */
export async function getPublishedBlogPosts(
  locale?: BlogLocale,
): Promise<BlogPost[]> {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection(COLLECTION).get();
    const now = Date.now();
    return snapshot.docs
      .map((doc) => mapDoc(doc.id, doc.data() as BlogDocData))
      .filter((post) => post.status === "published")
      .filter((post) => (post.publishedAt ?? 0) <= now)
      .filter((post) => (locale ? post.locale === locale : true))
      .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
  } catch {
    return [];
  }
}

/** Public: slug ile tek yazı döndürür. */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
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
