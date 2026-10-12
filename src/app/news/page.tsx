import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getNews } from "@/lib/data";

export const metadata: Metadata = pageMetadata({
  title: "News & updates",
  description: "Company and project news from Friends Associates.",
  path: "/news",
});

export default async function NewsPage() {
  const items = await getNews();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">News & updates</h1>
      <ul className="mt-8 space-y-6">
        {items.map((n) => (
          <li key={n.id}>
            <Link href={`/news/${n.slug}`} className="text-xl font-semibold hover:text-teal-800">
              {n.title}
            </Link>
            <p className="text-sm text-stone-500">{n.published_on}</p>
            <p className="mt-2 text-stone-600">{n.excerpt}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
