import Link from "next/link";
import type { Metadata } from "next";
import { CoverImage } from "@/components/public/CoverImage";
import { InvestmentDisclosure } from "@/components/public/InvestmentDisclosure";
import { INVESTMENT_STATUSES, INVESTMENT_TYPES, labelOf } from "@/lib/catalog";
import { getPublishedInvestments } from "@/lib/data";
import { formatPkr } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Investment opportunities",
  description:
    "Invest in the development of commercial plazas, residential homes, shops and markets with Friends Associates, Rahim Yar Khan. Minimum investment, timelines and terms for each project.",
  path: "/investment",
});

export default async function InvestmentPage() {
  const items = await getPublishedInvestments();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-semibold">Investment opportunities</h1>
      <p className="mt-3 max-w-2xl text-stone-600">
        Partner with Friends Associates in developing plazas, residential homes, shops and markets. Choose a project to see the minimum investment,
        timeline and how returns are shared, then register your interest.
      </p>
      <div className="mt-6">
        <InvestmentDisclosure />
      </div>
      {items.length === 0 ? (
        <p className="mt-8 text-stone-500">No opportunities are open right now. Contact us to be told about the next one.</p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {items.map((i) => (
            <article key={i.id} className="group relative flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm hover:shadow-md">
              <div className="relative">
                <CoverImage src={i.imagePath} alt={i.title} className="h-40" sizes="(min-width: 768px) 50vw, 100vw" />
                <span
                  className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${i.status === "open" ? "bg-teal-100 text-teal-900" : "bg-stone-800 text-white"}`}
                >
                  {labelOf(INVESTMENT_STATUSES, i.status)}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                  {labelOf(INVESTMENT_TYPES, i.investmentType)} · {i.location}, {i.city}
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  <Link href={`/investment/${i.slug}`} className="after:absolute after:inset-0 group-hover:text-teal-800">
                    {i.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm text-stone-600">{i.summary}</p>
                <dl className="mt-auto grid grid-cols-2 gap-3 pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-stone-500">Minimum</dt>
                    <dd className="font-semibold">{formatPkr(i.minimumInvestmentPkr)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-500">Timeline</dt>
                    <dd className="font-semibold">{i.expectedDuration}</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
