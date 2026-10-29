import Link from "next/link";
import { FormError } from "@/components/FormError";
import { Field, SelectField } from "@/components/admin/Field";
import { createBookingAction } from "@/lib/actions/bookings";
import { getAvailablePropertyOptions, getBuyerOptions, MAX_BOOKINGS_PER_BUYER } from "@/lib/data";
import { formatPkr } from "@/lib/format";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "New booking" };

type Props = { searchParams: Promise<{ buyer?: string; error?: string }> };

export default async function NewBookingPage({ searchParams }: Props) {
  await requireStaff("bookings", "add");
  const [sp, buyers, properties] = await Promise.all([searchParams, getBuyerOptions(), getAvailablePropertyOptions()]);
  const eligible = buyers.filter((b) => b._count.bookings < MAX_BOOKINGS_PER_BUYER);
  const today = new Date().toISOString().slice(0, 10);

  if (eligible.length === 0 || properties.length === 0) {
    return (
      <div className="px-4 py-6 sm:px-[30px] lg:py-10">
        <h1 className="text-[32px] leading-tight font-semibold tracking-tight lg:text-[44px]">New booking</h1>
        <p className="mt-4 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
          {eligible.length === 0 ? (
            <>
              No active buyer can take another booking. <Link href="/admin/customers/new" className="underline">Add a customer</Link> first.
            </>
          ) : (
            <>
              No properties are marked Available. <Link href="/admin/properties" className="underline">Update inventory</Link> first.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <h1 className="text-[32px] leading-tight font-semibold tracking-tight lg:text-[44px]">New booking</h1>
      <p className="mt-1.5 text-[15px] text-muted">
        The total price is copied from the property. Outstanding is calculated as total minus paid. The unit is marked Booked.
      </p>
      <FormError code={sp.error} />
      <form action={createBookingAction} className="mt-6 grid gap-4 admin-card p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <SelectField
            label="Buyer"
            name="user_id"
            required
            defaultValue={sp.buyer}
            options={eligible.map((b) => ({ value: b.id, label: `${b.name} (${b.email}) — ${b._count.bookings} booking(s)` }))}
          />
        </div>
        <div className="sm:col-span-2">
          <SelectField
            label="Property (available units only)"
            name="property_id"
            required
            options={properties.map((p) => ({ value: p.id, label: `${p.title} — ${p.project?.name ?? "Standalone"} — ${formatPkr(p.pricePkr)}` }))}
          />
        </div>
        <Field label="Booked on" name="booked_on" type="date" defaultValue={today} required />
        <Field label="Booking status" name="status" defaultValue="Instalments in progress" />
        <Field label="Amount paid so far (PKR)" name="paid_pkr" type="number" min={0} step={1} defaultValue={0} required />
        <Field label="Instalments received" name="payments_received" type="number" min={0} step={1} defaultValue={1} required />
        <Field label="Instalments remaining" name="payments_remaining" type="number" min={0} step={1} defaultValue={0} required />
        <Field label="Next payment date" name="next_payment_date" type="date" required />
        <Field label="Next payment amount (PKR)" name="next_payment_amount_pkr" type="number" min={0} step={1} defaultValue={0} required />
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
            Create booking
          </button>
        </div>
      </form>
    </div>
  );
}
