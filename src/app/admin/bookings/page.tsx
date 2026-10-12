import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { BookingsTable } from "@/components/admin/BookingsTable";
import { getBookingRows } from "@/lib/data";
import { formatPkr } from "@/lib/format";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Bookings & payments" };

export default async function AdminBookingsPage() {
  const { can } = await requireStaff("bookings", "view");
  const rows = await getBookingRows();
  const totals = rows.reduce(
    (t, r) => ({ value: t.value + r.totalPricePkr, paid: t.paid + r.paidPkr, outstanding: t.outstanding + r.outstandingPkr }),
    { value: 0, paid: 0, outstanding: 0 },
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminNav active="/admin/bookings" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bookings & payments</h1>
          <p className="text-sm text-stone-600">Figures here are what buyers see in their portal. There is no online checkout.</p>
        </div>
        {can("bookings", "add") && (
          <Link href="/admin/bookings/new" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
            New booking
          </Link>
        )}
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total booked value", value: totals.value },
          { label: "Received", value: totals.paid },
          { label: "Outstanding", value: totals.outstanding },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-white p-4">
            <dt className="text-sm text-stone-600">{s.label}</dt>
            <dd className="mt-1 text-xl font-semibold">{formatPkr(s.value)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6">
        <BookingsTable rows={rows} />
      </div>
    </div>
  );
}
