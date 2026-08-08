import { setRequestLocale } from "next-intl/server";
import { getPublishedBlogIndexPosts } from "@/actions/blog";
import { BlogIndex, type BlogIndexPost } from "./BlogIndex";

/** Public blog list — ISR; index cache omits article HTML. */
export const revalidate = 300;

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const posts = await getPublishedBlogIndexPosts();
  const indexPosts: BlogIndexPost[] = posts.map((post) => ({
    slug: post.slug,
    locale: post.locale,
    coverImageUrl: post.coverImageUrl,
    publishedAt: post.publishedAt,
    readTime: post.readTime,
    translations: post.translations,
  }));

  return <BlogIndex posts={indexPosts} />;
}
