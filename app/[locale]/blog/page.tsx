import { getPublishedBlogPosts } from "@/actions/blog";
import { BlogIndex, type BlogIndexPost } from "./BlogIndex";

/** Public blog list — short ISR window instead of force-dynamic on every request. */
export const revalidate = 60;

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts();
  const indexPosts: BlogIndexPost[] = posts.map((post) => ({
    slug: post.slug,
    locale: post.locale,
    coverImageUrl: post.coverImageUrl,
    publishedAt: post.publishedAt,
    readTime: post.readTime,
    translations: {
      tr: {
        title: post.translations.tr.title,
        excerpt: post.translations.tr.excerpt,
        category: post.translations.tr.category,
      },
      en: {
        title: post.translations.en.title,
        excerpt: post.translations.en.excerpt,
        category: post.translations.en.category,
      },
    },
  }));

  return <BlogIndex posts={indexPosts} />;
}
