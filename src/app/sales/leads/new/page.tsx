import type { Metadata } from "next";
import { FormError } from "@/components/FormError";
import { Field } from "@/components/admin/Field";
import { addLeadAction } from "@/lib/actions/leads";
import { requireStaff } from "@/lib/permissions";

export const metadata: Metadata = { title: "Add lead", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewLeadPage({ searchParams }: Props) {
  await requireStaff("leads", "add");
  const { error } = await searchParams;
  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <h1 className="text-[32px] leading-tight font-semibold tracking-tight lg:text-[44px]">Add lead</h1>
      <p className="mt-1.5 text-[15px] text-muted">For walk-in, phone or referral enquiries.</p>
      <FormError code={error} />
      <form action={addLeadAction} className="mt-6 grid gap-4 admin-card p-6 sm:grid-cols-2">
        <Field label="Name" name="name" required minLength={2} maxLength={120} />
        <Field label="Phone" name="phone" type="tel" required placeholder="03xx-xxxxxxx" />
        <Field label="Email" name="email" type="email" />
        <Field label="City" name="city" defaultValue="Rahim Yar Khan" />
        <div className="sm:col-span-2">
          <Field label="Interest" name="interest" placeholder="e.g. Petrol pump NOC, 10 Marla house for sale" maxLength={150} />
        </div>
        <Field label="Service" name="service" />
        <Field label="Location" name="location" />
        <Field label="Budget" name="budget" />
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-stone-700">Notes from the call</span>
          <textarea name="message" rows={4} maxLength={2000} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
            Save lead
          </button>
        </div>
      </form>
    </div>
  );
}
