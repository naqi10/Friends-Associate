import Link from "next/link";
import { CONTAINER, PageHero } from "@/components/public/ui";
import { formatDate } from "@/lib/format";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getNews, getPageContent } from "@/lib/data";

export const metadata: Metadata = pageMetadata({
  title: "News & updates",
  description: "Company and project news from Friends Associates.",
  path: "/news",
});

export default async function NewsPage() {
  const [items, page] = await Promise.all([getNews(), getPageContent("page.news")]);
  return (
    <div className="bg-paper text-ink">
      <PageHero title={page.title} intro={page.intro} eyebrow="News & updates" />
      <div className={`${CONTAINER} py-14 md:py-20`}>
        {items.length === 0 ? (
          <p className="mx-auto max-w-xl rounded-card border border-dashed border-line-strong p-8 text-center text-body">No news yet.</p>
        ) : (
          <ul className="mx-auto flex max-w-[1000px] flex-col border-t border-ink">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/news/${n.slug}`}
                  className="grid grid-cols-[minmax(0,1fr)_24px] items-center gap-x-6 gap-y-2 border-b border-line py-7 hover:bg-mist sm:grid-cols-[140px_minmax(0,1fr)_24px]"
                >
                  <time dateTime={n.published_on} className="col-span-2 text-sm text-muted sm:col-span-1">
                    {formatDate(n.published_on)}
                  </time>
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className="font-serif text-[clamp(24px,3vw,30px)] leading-tight">{n.title}</span>
                    <span className="text-sm text-muted">{n.excerpt}</span>
                  </span>
                  <span aria-hidden className="text-xl">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
