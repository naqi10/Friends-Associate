import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { InvestmentDisclosure } from "@/components/public/InvestmentDisclosure";
import { BTN_DARK, CONTAINER, INPUT, PageHero } from "@/components/public/ui";
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
  const input = INPUT;

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
    <div className="bg-paper text-ink">
      <PageHero
        title={i.title}
        eyebrow="Investment opportunity"
        intro={i.summary}
        crumbs={[{ href: "/", label: "Home" }, { href: "/investment", label: "Investment" }, { label: i.title }]}
      >
        <a href="#enquiry" className={BTN_DARK}>
          Register your interest <span aria-hidden>→</span>
        </a>
      </PageHero>
      <div className={`${CONTAINER} py-12 md:py-16`}>
      <div className="overflow-hidden rounded-tile">
        <CoverImage src={i.imagePath} alt={i.title} className="h-64 md:h-[420px]" sizes="(min-width: 1280px) 1232px, 100vw" preload />
      </div>

      <div className="mt-12 grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <p className="whitespace-pre-line text-[17px] leading-relaxed text-body">{i.description}</p>
          <dl className="mt-8 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label} className="bg-paper p-5">
                <dt className="text-xs tracking-[0.12em] text-muted uppercase">{f.label}</dt>
                <dd className="mt-1.5 text-[17px] font-semibold">{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 rounded-card border border-line bg-paper p-5">
            <h2 className="font-semibold">How returns work</h2>
            <p className="mt-2 text-sm text-body">{i.returnsNote}</p>
            {i.figuresReviewedOn && <p className="mt-2 text-xs text-muted">Figures last reviewed on {formatDate(i.figuresReviewedOn)}.</p>}
          </div>
          {i.project && (
            <p className="mt-6 text-sm">
              Linked project:{" "}
              <Link href={`/projects/${i.project.slug}`} className="font-medium text-ink hover:underline">
                {i.project.name}
              </Link>{" "}
              ({i.project.progressPercent}% complete)
            </p>
          )}
          <div className="mt-6">
            <InvestmentDisclosure />
          </div>
        </div>

        <aside id="enquiry" className="scroll-mt-28 self-start rounded-card border border-line bg-paper p-6 lg:sticky lg:top-28">
          <h2 className="text-[20px] font-semibold">{open ? "Register your interest" : "This opportunity is not open"}</h2>
          {open ? (
            <>
              <p className="mt-1 text-sm text-body">Our team will call you to explain terms and next steps. No payment is taken online.</p>
              <div className="mt-3">
                <FormStatus sent={sp.sent} error={sp.error} sentText="Thank you — our investment team will contact you." />
              </div>
              <form action={investmentInterestAction} className="relative mt-3 space-y-3">
                <Honeypot />
                <input type="hidden" name="investmentId" value={i.id} />
                <input type="hidden" name="returnTo" value={`/investment/${i.slug}`} />
                <label className="block text-sm font-medium text-body">
                  Name
                  <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={input} />
                </label>
                <label className="block text-sm font-medium text-body">
                  Phone / WhatsApp
                  <input name="phone" type="tel" required pattern="\+?[0-9][0-9\s\-]{6,18}" placeholder="03xx-xxxxxxx" autoComplete="tel" className={input} />
                </label>
                <label className="block text-sm font-medium text-body">
                  Email (optional)
                  <input name="email" type="email" maxLength={200} autoComplete="email" className={input} />
                </label>
                <label className="block text-sm font-medium text-body">
                  City
                  <input name="city" maxLength={60} className={input} />
                </label>
                <label className="block text-sm font-medium text-body">
                  Amount you are considering
                  <select name="amount" className={input}>
                    <option>{`${formatPkr(i.minimumInvestmentPkr)} (minimum)`}</option>
                    <option>Up to 50 lakh</option>
                    <option>50 lakh – 1 crore</option>
                    <option>Above 1 crore</option>
                    <option>Not sure yet</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-body">
                  Questions (optional)
                  <textarea name="message" rows={3} maxLength={1000} className={input} />
                </label>
                <button type="submit" className={`${BTN_DARK} w-full`}>
                  Register interest
                </button>
              </form>
            </>
          ) : (
            <p className="mt-2 text-sm text-body">
              <Link href="/investment" className="text-ink underline">
                See open opportunities
              </Link>{" "}
              or contact us to hear about the next one.
            </p>
          )}
        </aside>
      </div>
      </div>
    </div>
  );
}
