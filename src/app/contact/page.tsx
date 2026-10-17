import type { Metadata } from "next";
import { FormStatus, Honeypot } from "@/components/public/EnquiryForms";
import { contactAction } from "@/lib/actions/leads";
import { BRAND } from "@/lib/brand";
import { getCompany, getFaqs, getHomeExtras, getOffices, getPageContent, getPublishedServices } from "@/lib/data";
import { jsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact us",
  description: `Contact ${BRAND.name}, ${BRAND.city} — call or WhatsApp ${BRAND.phone} for architecture, construction, NOC consultancy and property enquiries.`,
  path: "/contact",
});

type Props = { searchParams: Promise<{ sent?: string; error?: string }> };

const OTHER_OPTIONS = ["Buying a property", "Selling / renting out a property", "Investment", "Other"];

export default async function ContactPage({ searchParams }: Props) {
  const [sp, company, offices, page, faqs, extras] = await Promise.all([
    searchParams,
    getCompany(),
    getOffices(),
    getPageContent("page.contact"),
    getFaqs(),
    getHomeExtras(),
  ]);
  const serviceOptions = [...new Set([...(await getPublishedServices()).map((s) => s.name), ...OTHER_OPTIONS])];
  const whatsapp = `https://wa.me/${company.whatsapp.replace(/\D/g, "")}`;
  const input = "mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-semibold">{page.title}</h1>
      {page.intro && <p className="mt-2 text-stone-600">{page.intro}</p>}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <p className="text-lg font-semibold">{company.name}</p>
            <p className="text-sm text-stone-500">{company.website}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={`tel:${BRAND.phoneIntl.replace(/\s/g, "")}`} className="rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900">
                Call {BRAND.phone}
              </a>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-md border border-teal-800 px-4 py-2 text-sm font-semibold text-teal-900 hover:bg-teal-50">
                WhatsApp
              </a>
            </div>
            <p className="mt-4 text-sm">
              Email:{" "}
              <a href={`mailto:${company.email}`} className="text-teal-800 underline">
                {company.email}
              </a>
            </p>
            {extras.hours && <p className="mt-1 text-sm text-stone-600">Office hours: {extras.hours}</p>}
          </div>
          <ul className="space-y-4 text-sm">
            {offices.map((o) => (
              <li key={o.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <p className="font-medium">
                  {o.city}
                  {o.city === BRAND.city && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">Head office</span>}
                </p>
                <p className="text-stone-600">{o.address}</p>
                <p>{o.phone}</p>
              </li>
            ))}
          </ul>
        </div>

        <section id="enquiry" className="scroll-mt-24 rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Send an enquiry</h2>
          <div className="mt-3">
            <FormStatus sent={sp.sent} error={sp.error} sentText="Thank you — we received your message and will contact you soon." />
          </div>
          <form action={contactAction} className="relative mt-3 grid gap-3 sm:grid-cols-2">
            <Honeypot />
            <input type="hidden" name="returnTo" value="/contact" />
            <label className="text-sm">
              Name
              <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={input} />
            </label>
            <label className="text-sm">
              Phone / WhatsApp
              <input name="phone" type="tel" required pattern="\+?[0-9][0-9\s\-]{6,18}" placeholder="03xx-xxxxxxx" autoComplete="tel" className={input} />
            </label>
            <label className="text-sm">
              Email (optional)
              <input name="email" type="email" maxLength={200} autoComplete="email" className={input} />
            </label>
            <label className="text-sm">
              City
              <input name="city" maxLength={60} autoComplete="address-level2" className={input} />
            </label>
            <label className="text-sm sm:col-span-2">
              Service
              <select name="service" className={input}>
                {serviceOptions.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              Project details
              <textarea
                name="message"
                required
                rows={5}
                maxLength={2000}
                placeholder="e.g. 5 Marla house plan and construction estimate in Rahim Yar Khan"
                className={input}
              />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400">
                Send enquiry
              </button>
            </div>
          </form>
        </section>
      </div>

      {faqs.length > 0 && (
        <section id="faq" aria-labelledby="faq-heading" className="mt-14 scroll-mt-24">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={jsonLd({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
            })}
          />
          <h2 id="faq-heading" className="font-display text-3xl font-semibold">
            Frequently asked questions
          </h2>
          <div className="mt-6 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
            {faqs.map((f) => (
              <details key={f.id} className="group p-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-medium">
                  {f.question}
                  <span aria-hidden className="text-xl leading-none text-stone-400 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 whitespace-pre-line text-sm text-stone-600">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
