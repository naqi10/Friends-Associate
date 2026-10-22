import { notFound } from "next/navigation";
import { CONTAINER, PageHero } from "@/components/public/ui";
import { formatDate } from "@/lib/format";
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
    <article className="bg-paper text-ink">
      <PageHero
        title={item.title}
        eyebrow={formatDate(item.published_on)}
        intro={item.excerpt}
        crumbs={[{ href: "/", label: "Home" }, { href: "/news", label: "News" }, { label: item.title }]}
      />
      <div className={`${CONTAINER} py-14 md:py-20`}>
        <p className="mx-auto max-w-[720px] whitespace-pre-wrap text-[18px] leading-[1.8] text-body">{item.body}</p>
      </div>
    </article>
  );
}
