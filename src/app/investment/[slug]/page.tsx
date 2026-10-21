import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { InvestmentDisclosure } from "@/components/public/InvestmentDisclosure";
import { CoverImage } from "@/components/public/CoverImage";
import { FormStatus, Honeypot } from "@/components/public/EnquiryForms";
import { investmentInterestAction } from "@/lib/actions/leads";
import { INVESTMENT_STATUSES, INVESTMENT_TYPES, labelOf } from "@/lib/catalog";
import { getInvestmentBySlug } from "@/lib/data";
import { formatDate, formatPkr } from "@/lib/format";
import { pageMetadata, metaDescription } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ sent?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const i = await getInvestmentBySlug(slug);
  if (!i || !i.published) return { title: "Investment" };
  return pageMetadata({
    title: `Invest in ${i.title}, ${i.city}`,
    description: metaDescription(`${i.summary} Minimum investment ${formatPkr(i.minimumInvestmentPkr)}. ${i.expectedDuration}.`),
    path: `/investment/${i.slug}`,
  });
}

export default async function InvestmentDetailPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const i = await getInvestmentBySlug(slug);
  if (!i || !i.published) notFound();
  const open = i.status === "open";
  const input = "mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm";

  const facts = [
    { label: "Type", value: labelOf(INVESTMENT_TYPES, i.investmentType) },
    { label: "Location", value: `${i.location}, ${i.city}` },
    { label: "Minimum investment", value: formatPkr(i.minimumInvestmentPkr) },
    { label: "Total to be raised", value: i.targetAmountPkr ? formatPkr(i.targetAmountPkr) : "" },
    { label: "Expected timeline", value: i.expectedDuration },
    { label: "Payment structure", value: i.paymentStructure },
    { label: "Status", value: labelOf(INVESTMENT_STATUSES, i.status) },
    { label: "Last updated", value: formatDate(i.updatedAt.toISOString()) },
  ].filter((f) => f.value);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-stone-500">
        <Link href="/investment" className="hover:underline">
          Investment opportunities
        </Link>{" "}
        / <span className="text-stone-700">{i.title}</span>
      </nav>
      <div className="mt-4 overflow-hidden rounded-2xl">
        <CoverImage src={i.imagePath} alt={i.title} className="h-56 md:h-72" sizes="(min-width: 1024px) 1024px, 100vw" preload />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="font-serif text-5xl leading-none text-balance">{i.title}</h1>
          <p className="mt-3 text-lg text-stone-600">{i.summary}</p>
          <p className="mt-6 whitespace-pre-line leading-relaxed text-stone-700">{i.description}</p>
          <dl className="mt-8 grid gap-4 rounded-xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="text-xs text-stone-500">{f.label}</dt>
                <dd className="font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">How returns work</h2>
            <p className="mt-2 text-sm text-stone-700">{i.returnsNote}</p>
            {i.figuresReviewedOn && <p className="mt-2 text-xs text-stone-500">Figures last reviewed on {formatDate(i.figuresReviewedOn)}.</p>}
          </div>
          {i.project && (
            <p className="mt-6 text-sm">
              Linked project:{" "}
              <Link href={`/projects/${i.project.slug}`} className="font-medium text-teal-800 hover:underline">
                {i.project.name}
              </Link>{" "}
              ({i.project.progressPercent}% complete)
            </p>
          )}
          <div className="mt-6">
            <InvestmentDisclosure />
          </div>
        </div>

        <aside id="enquiry" className="scroll-mt-24 self-start rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">{open ? "Register your interest" : "This opportunity is not open"}</h2>
          {open ? (
            <>
              <p className="mt-1 text-sm text-stone-600">Our team will call you to explain terms and next steps. No payment is taken online.</p>
              <div className="mt-3">
                <FormStatus sent={sp.sent} error={sp.error} sentText="Thank you — our investment team will contact you." />
              </div>
              <form action={investmentInterestAction} className="relative mt-3 space-y-3">
                <Honeypot />
                <input type="hidden" name="investmentId" value={i.id} />
                <input type="hidden" name="returnTo" value={`/investment/${i.slug}`} />
                <label className="block text-sm">
                  Name
                  <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={input} />
                </label>
                <label className="block text-sm">
                  Phone / WhatsApp
                  <input name="phone" type="tel" required pattern="\+?[0-9][0-9\s\-]{6,18}" placeholder="03xx-xxxxxxx" autoComplete="tel" className={input} />
                </label>
                <label className="block text-sm">
                  Email (optional)
                  <input name="email" type="email" maxLength={200} autoComplete="email" className={input} />
                </label>
                <label className="block text-sm">
                  City
                  <input name="city" maxLength={60} className={input} />
                </label>
                <label className="block text-sm">
                  Amount you are considering
                  <select name="amount" className={input}>
                    <option>{`${formatPkr(i.minimumInvestmentPkr)} (minimum)`}</option>
                    <option>Up to 50 lakh</option>
                    <option>50 lakh – 1 crore</option>
                    <option>Above 1 crore</option>
                    <option>Not sure yet</option>
                  </select>
                </label>
                <label className="block text-sm">
                  Questions (optional)
                  <textarea name="message" rows={3} maxLength={1000} className={input} />
                </label>
                <button type="submit" className="w-full rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400">
                  Register interest
                </button>
              </form>
            </>
          ) : (
            <p className="mt-2 text-sm text-stone-600">
              <Link href="/investment" className="text-teal-800 underline">
                See open opportunities
              </Link>{" "}
              or contact us to hear about the next one.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
