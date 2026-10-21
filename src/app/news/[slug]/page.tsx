import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata, metaDescription } from "@/lib/seo";
import { getNewsBySlug } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const n = await getNewsBySlug(slug);
  if (!n) return { title: "News" };
  return pageMetadata({
    title: n.seo_title ?? n.title,
    description: metaDescription(n.seo_description || n.excerpt, n.title),
    path: `/news/${n.slug}`,
    type: "article",
  });
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params;
  const item = await getNewsBySlug(slug);
  if (!item) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{item.title}</h1>
      <p className="mt-2 text-sm text-stone-500">{item.published_on}</p>
      <p className="mt-8 whitespace-pre-wrap text-stone-700">{item.body}</p>
    </article>
  );
}
