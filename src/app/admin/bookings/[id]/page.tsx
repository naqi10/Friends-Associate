import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { Field, Notice, SelectField } from "@/components/admin/Field";
import { recordPaymentAction, updateBookingAction } from "@/lib/actions/bookings";
import { getBooking } from "@/lib/data";
import { formatDate, formatPkr } from "@/lib/format";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Booking" };

const SAVED: Record<string, string> = {
  created: "Booking created and the unit marked Booked. The buyer can see it in their portal now.",
  updated: "Booking saved.",
  payment: "Payment recorded. Paid, outstanding and instalment counts were updated.",
};

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function BookingDetailPage({ params, searchParams }: Props) {
  const { can } = await requireStaff("bookings", "view");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const b = await getBooking(id);
  if (!b) notFound();
  const pct = b.totalPricePkr > 0 ? Math.round((b.paidPkr / b.totalPricePkr) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <AdminNav active="/admin/bookings" />
      <Link href="/admin/bookings" className="text-sm text-stone-600 hover:underline">
        ← All bookings
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{b.property.title}</h1>
      <p className="text-sm text-stone-600">
        {b.project.name} · Buyer{" "}
        <Link href={`/admin/customers/${b.user.id}`} className="text-teal-800 hover:underline">
          {b.user.name}
        </Link>{" "}
        · Booked {formatDate(b.bookedOn)}
      </p>
      <Notice message={sp.saved ? SAVED[sp.saved] : undefined} />
      <FormError code={sp.error} />

      <dl className="mt-6 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total price", value: formatPkr(b.totalPricePkr) },
          { label: "Paid", value: formatPkr(b.paidPkr) },
          { label: "Outstanding", value: formatPkr(b.outstandingPkr) },
          { label: "Paid so far", value: `${pct}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-white p-4">
            <dt className="text-xs text-stone-500">{s.label}</dt>
            <dd className="mt-1 font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Record a received payment</h2>
        <p className="mt-1 text-sm text-stone-600">
          Use this after a bank transfer, cash or cheque clears. It adds to Paid, reduces Outstanding and moves one instalment from remaining to received.
        </p>
        {!can("payments", "add") ? (
          <p className="mt-3 text-sm text-stone-500">You do not have permission to record payments.</p>
        ) : b.outstandingPkr === 0 ? (
          <p className="mt-3 text-sm text-teal-800">Fully paid. No balance outstanding.</p>
        ) : (
          <form action={recordPaymentAction} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={b.id} />
            <div className="w-48">
              <Field label="Amount (PKR)" name="amount_pkr" type="number" min={1} max={b.outstandingPkr} step={1} defaultValue={b.nextPaymentAmountPkr || undefined} required />
            </div>
            <div className="w-44">
              <SelectField label="Method" name="method" options={["Bank Transfer", "Cash", "Cheque", "Other"]} />
            </div>
            <button type="submit" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
              Record payment
            </button>
          </form>
        )}
      </section>

      {can("bookings", "update") && (
      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Edit schedule and figures</h2>
        <form action={updateBookingAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={b.id} />
          <Field label="Booking status" name="status" defaultValue={b.status} />
          <SelectField label="Unit status" name="property_status" options={["Booked", "Sold"]} defaultValue={b.property.status === "Sold" ? "Sold" : "Booked"} />
          <Field
            label="Total paid (PKR)"
            name="paid_pkr"
            type="number"
            min={0}
            max={b.totalPricePkr}
            step={1}
            defaultValue={b.paidPkr}
            required
            readOnly={!can("payments", "update")}
            hint={can("payments", "update") ? "Outstanding is recalculated from the total price." : "Changing the paid amount needs Payments → Edit."}
          />
          <Field label="Instalments received" name="payments_received" type="number" min={0} step={1} defaultValue={b.paymentsReceived} required />
          <Field label="Instalments remaining" name="payments_remaining" type="number" min={0} step={1} defaultValue={b.paymentsRemaining} required />
          <Field label="Next payment date" name="next_payment_date" type="date" defaultValue={b.nextPaymentDate} required />
          <Field label="Next payment amount (PKR)" name="next_payment_amount_pkr" type="number" min={0} step={1} defaultValue={b.nextPaymentAmountPkr} required />
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50">
              Save changes
            </button>
          </div>
        </form>
      </section>
      )}
    </div>
  );
}
