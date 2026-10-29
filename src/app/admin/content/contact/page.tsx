import Link from "next/link";
import { FormError } from "@/components/FormError";
import { ContentTabs } from "@/components/admin/ContentTabs";
import { Field, Notice } from "@/components/admin/Field";
import { saveContactAction, saveOfficeAction, sendTestEmailAction } from "@/lib/actions/site-content";
import { emailSetup } from "@/lib/email";
import { BRAND } from "@/lib/brand";
import { getCompany, getOffices } from "@/lib/data";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Contact & footer" };

const SAVED: Record<string, string> = { company: "Contact details saved.", office: "Office saved." };

type Props = { searchParams: Promise<{ saved?: string; error?: string; test?: string; to?: string; why?: string }> };

export default async function ContactContentPage({ searchParams }: Props) {
  const { user } = await requireAdmin();
  const [sp, company, offices] = await Promise.all([searchParams, getCompany(), getOffices()]);
  const mail = emailSetup();

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <h1 className="text-[32px] leading-tight font-semibold tracking-tight lg:text-[44px]">Website content</h1>
      <ContentTabs active="/admin/content/contact" />
      <p className="mt-4 text-sm text-stone-600">
        Shown on the{" "}
        <Link href="/contact" target="_blank" className="text-teal-800 underline">
          Contact page
        </Link>{" "}
        and in the footer of every page. Office hours and social links are under Home page → Home page details.
      </p>
      <Notice message={sp.saved ? SAVED[sp.saved] : undefined} />
      <FormError code={sp.error} />

      <form id="company" action={saveContactAction} className="mt-6 scroll-mt-24 space-y-4 admin-card p-6">
        <h2 className="font-semibold">Company contact details</h2>
        <Field label="Tagline (under the name in the footer)" name="tagline" defaultValue={company.tagline} maxLength={120} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" name="email" type="email" defaultValue={company.email} maxLength={200} required />
          <Field label="WhatsApp number" name="whatsapp" type="tel" defaultValue={company.whatsapp} maxLength={30} required hint="e.g. +92 312 6711828" />
        </div>
        <p className="text-xs text-stone-500">The main phone number ({BRAND.phone}) is part of the site design; ask the developer to change it.</p>
        <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
          Save contact details
        </button>
      </form>

      <section id="email" className="mt-6 scroll-mt-24 space-y-4 admin-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Email (Brevo)</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${mail.enabled ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
            {mail.enabled ? "On" : "Off"}
          </span>
        </div>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[180px_1fr]">
          <dt className="text-stone-500">API key</dt>
          <dd>{mail.hasKey ? "Set" : "Missing: add BREVO_API_KEY in Vercel → Settings → Environment Variables"}</dd>
          <dt className="text-stone-500">Sender</dt>
          <dd>{mail.from ? `${mail.fromName} <${mail.from}>` : "Missing: add EMAIL_FROM (an address on your verified domain, e.g. no-reply@faryk.com)"}</dd>
          <dt className="text-stone-500">Enquiry alerts go to</dt>
          <dd>{mail.alertTo || `${company.email} (company email above; set LEAD_ALERT_TO to change)`}</dd>
        </dl>
        <p className="text-sm text-stone-600">
          Sent automatically: new enquiry alerts to the office, a &ldquo;we received your enquiry&rdquo; reply to the visitor, and to customers: new documents,
          payments received, instalment reminders and construction progress.
        </p>
        {sp.test === "sent" && (
          <p className="rounded-md bg-teal-50 p-3 text-sm text-teal-900">
            Test email accepted by Brevo and sent to {sp.to}. Check the inbox (and the spam folder) in a minute.
          </p>
        )}
        {sp.test === "failed" && <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">Test email failed. {sp.why}</p>}
        <form action={sendTestEmailAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <Field label="Send a test email to" name="to" type="email" defaultValue={user.email} maxLength={200} />
          </div>
          <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
            Send test email
          </button>
        </form>
      </section>

      <h2 className="mt-8 text-lg font-semibold">Offices</h2>
      <div className="mt-4 grid items-start gap-5 lg:grid-cols-3">
        {offices.map((o) => (
          <form key={o.id} id={`o-${o.id}`} action={saveOfficeAction} className="scroll-mt-24 space-y-3 admin-card p-5">
            <input type="hidden" name="id" value={o.id} />
            <h3 className="font-semibold">
              {o.city}
              {o.city === BRAND.city && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">Head office</span>}
            </h3>
            <Field label="Address" name="address" defaultValue={o.address} maxLength={200} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone" name="phone" type="tel" defaultValue={o.phone} maxLength={40} />
              <Field label="Display order" name="sort_order" type="number" min={0} max={999} defaultValue={o.sort_order} />
            </div>
            <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
              Save {o.city} office
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
