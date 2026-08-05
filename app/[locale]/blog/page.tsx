import { getPublishedBlogPosts } from "@/actions/blog";
import { BlogIndex, type BlogIndexPost } from "./BlogIndex";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts();
  const indexPosts: BlogIndexPost[] = posts.map((post) => ({
    slug: post.slug,
    locale: post.locale,
    translations: post.translations,
    coverImageUrl: post.coverImageUrl,
    publishedAt: post.publishedAt,
  }));

  return <BlogIndex posts={indexPosts} />;
}
