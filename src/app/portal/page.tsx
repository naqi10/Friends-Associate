import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { formatDate, formatPkr } from "@/lib/format";
import { getBookingsForUserDetailed, getCompany, getNotifications } from "@/lib/data";
import { requireUser } from "@/lib/require-user";

export default async function PortalDashboardPage() {
  const user = await requireUser(["buyer"]);
  const [bookings, company, notices] = await Promise.all([getBookingsForUserDetailed(user.id), getCompany(), getNotifications(user.id, 5)]);
  const unread = notices.filter((n) => !n.readAt);

  return (
    <PortalShell title={`Assalam-o-Alaikum, ${user.name}`}>
      <p className="text-stone-600">Welcome to your Friends Associates customer portal.</p>
      {!user.document_download_paid_at && (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Document downloads require a one-time fee of PKR {company.document_download_fee_pkr.toLocaleString()} (recorded by admin when paid).
        </p>
      )}
      {notices.length > 0 && (
        <section aria-labelledby="notices" className="mt-6 rounded-xl border bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h2 id="notices" className="font-semibold">
              Notifications{unread.length > 0 && <span className="ml-2 rounded-full bg-teal-700 px-2 py-0.5 text-xs text-white">{unread.length} new</span>}
            </h2>
            <Link href="/portal/notifications" className="text-sm text-teal-800 hover:underline">
              See all
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-stone-100">
            {notices.slice(0, 3).map((n) => (
              <li key={n.id} className="py-2 text-sm">
                <p className={n.readAt ? "text-stone-600" : "font-medium"}>{n.title}</p>
                {n.message && <p className="line-clamp-2 text-stone-500">{n.message}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <h2 className="mt-8 text-lg font-semibold">Your properties</h2>
      {bookings.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">No properties assigned to your account yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {bookings.map((b) => {
              const prop = b.property;
              const proj = b.project;
              const cancelled = b.status === "Cancelled";
              return (
                <li key={b.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  <p className="font-medium">
                    {prop?.title}
                    {cancelled && <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-normal text-stone-600">Booking cancelled</span>}
                  </p>
                  <p className="text-sm text-stone-600">{proj?.name}</p>
                  <p className="mt-2 text-sm">
                    Paid {formatPkr(b.paid_pkr)}
                    {!cancelled && <> · Outstanding {formatPkr(b.outstanding_pkr)}</>}
                  </p>
                  {!cancelled && b.outstanding_pkr > 0 && (
                    <p className="text-sm text-stone-600">
                      Next payment {formatDate(b.next_payment_date)} — {formatPkr(b.next_payment_amount_pkr)}
                    </p>
                  )}
                  {!cancelled && <p className="text-sm">Construction: {proj?.progress_percent}%</p>}
                  <Link href="/portal/payments" className="mt-2 inline-block text-sm text-teal-800">
                    View payments
                  </Link>
                </li>
              );
            })}
        </ul>
      )}
    </PortalShell>
  );
}
