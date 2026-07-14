import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlogPostBySlug } from "@/actions/blog";
import { BlogArticle, type BlogArticleData } from "./BlogArticle";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) {
    return { title: "Score AI Blog" };
  }
  return {
    title: `${post.translations[post.locale].title} | Score AI`,
    description: post.translations[post.locale].excerpt,
    openGraph: {
      title: post.translations[post.locale].title,
      description: post.translations[post.locale].excerpt,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const data: BlogArticleData = {
    slug: post.slug,
    author: post.author,
    locale: post.locale,
    coverImageUrl: post.coverImageUrl,
    translations: post.translations,
    publishedAt: post.publishedAt,
  };

  return <BlogArticle post={data} />;
}
