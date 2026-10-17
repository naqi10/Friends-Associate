import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { ContentTabs } from "@/components/admin/ContentTabs";
import { Field, Notice } from "@/components/admin/Field";
import { saveContactAction, saveOfficeAction } from "@/lib/actions/site-content";
import { BRAND } from "@/lib/brand";
import { getCompany, getOffices } from "@/lib/data";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Contact & footer" };

const SAVED: Record<string, string> = { company: "Contact details saved.", office: "Office saved." };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function ContactContentPage({ searchParams }: Props) {
  await requireAdmin();
  const [sp, company, offices] = await Promise.all([searchParams, getCompany(), getOffices()]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminNav active="/admin/content" />
      <h1 className="text-2xl font-bold">Website content</h1>
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

      <form id="company" action={saveContactAction} className="mt-6 scroll-mt-24 space-y-4 rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Company contact details</h2>
        <Field label="Tagline (under the name in the footer)" name="tagline" defaultValue={company.tagline} maxLength={120} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" name="email" type="email" defaultValue={company.email} maxLength={200} required />
          <Field label="WhatsApp number" name="whatsapp" type="tel" defaultValue={company.whatsapp} maxLength={30} required hint="e.g. +92 312 6711828" />
        </div>
        <p className="text-xs text-stone-500">The main phone number ({BRAND.phone}) is part of the site design; ask the developer to change it.</p>
        <button type="submit" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
          Save contact details
        </button>
      </form>

      <h2 className="mt-8 text-lg font-semibold">Offices</h2>
      <div className="mt-4 space-y-4">
        {offices.map((o) => (
          <form key={o.id} id={`o-${o.id}`} action={saveOfficeAction} className="scroll-mt-24 space-y-3 rounded-xl border bg-white p-5">
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
            <button type="submit" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
              Save {o.city} office
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
