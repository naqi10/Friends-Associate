import Link from "next/link";
import type { Metadata } from "next";
import { HomeImage, Pill } from "@/components/home/HomeImage";
import { CONTAINER, PageHero } from "@/components/public/ui";
import { InvestmentDisclosure } from "@/components/public/InvestmentDisclosure";
import { INVESTMENT_STATUSES, INVESTMENT_TYPES, labelOf } from "@/lib/catalog";
import { getPageContent, getPublishedInvestments } from "@/lib/data";
import { formatPkr } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Investment opportunities",
  description:
    "Invest in commercial plazas, homes, shops and markets with Friends Associates, Rahim Yar Khan. See the minimum investment, timeline and terms of each project.",
  path: "/investment",
});

export default async function InvestmentPage() {
  const [items, page] = await Promise.all([getPublishedInvestments(), getPageContent("page.investment")]);
  return (
    <div className="bg-paper text-ink">
      <PageHero title={page.title} intro={page.intro} eyebrow="Investment" />
      <div className={`${CONTAINER} pb-20`}>
      <div className="mx-auto mt-10 max-w-[900px]">
        <InvestmentDisclosure />
      </div>
      {items.length === 0 ? (
        <p className="mx-auto mt-10 max-w-xl rounded-card border border-dashed border-line-strong p-8 text-center text-body">No opportunities are open right now. Contact us to be told about the next one.</p>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {items.map((i) => (
            <article key={i.id} className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-paper transition-transform duration-200 hover:-translate-y-1">
              <HomeImage src={i.imagePath} alt={i.title} className="h-[240px]" sizes="(min-width: 768px) 600px, 100vw">
                <div className="flex w-full items-start justify-between gap-2 p-3.5">
                  <Pill tone="dark">{labelOf(INVESTMENT_STATUSES, i.status)}</Pill>
                  <Pill>{i.city}</Pill>
                </div>
              </HomeImage>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
                  {labelOf(INVESTMENT_TYPES, i.investmentType)} · {i.location}
                </p>
                <h2 className="text-[22px] font-semibold">
                  <Link href={`/investment/${i.slug}`} className="after:absolute after:inset-0">
                    {i.title}
                  </Link>
                </h2>
                <p className="text-[15px] leading-relaxed text-body">{i.summary}</p>
                <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-line pt-4">
                  <div>
                    <dt className="text-xs text-muted">Minimum</dt>
                    <dd className="font-serif text-[28px] leading-none">{formatPkr(i.minimumInvestmentPkr)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Timeline</dt>
                    <dd className="mt-1 text-[15px] font-semibold">{i.expectedDuration}</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
