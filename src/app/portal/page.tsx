import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { formatDate, formatPkr } from "@/lib/format";
import { getBookingsForUserDetailed, getCompany } from "@/lib/data";
import { requireUser } from "@/lib/require-user";

export default async function PortalDashboardPage() {
  const user = await requireUser(["buyer"]);
  const [bookings, company] = await Promise.all([getBookingsForUserDetailed(user.id), getCompany()]);

  return (
    <PortalShell title={`Assalam-o-Alaikum, ${user.name}`}>
      <p className="text-stone-600">Welcome to your Friends Associates customer portal.</p>
      {!user.document_download_paid_at && (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Document downloads require a one-time fee of PKR {company.document_download_fee_pkr.toLocaleString()} (recorded by admin when paid).
        </p>
      )}
      <h2 className="mt-8 text-lg font-semibold">Your properties</h2>
      {bookings.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">No properties assigned to your account yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {bookings.map((b) => {
              const prop = b.property;
              const proj = b.project;
              return (
                <li key={b.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  <p className="font-medium">{prop?.title}</p>
                  <p className="text-sm text-stone-600">{proj?.name}</p>
                  <p className="mt-2 text-sm">
                    Paid {formatPkr(b.paid_pkr)} · Outstanding {formatPkr(b.outstanding_pkr)}
                  </p>
                  <p className="text-sm text-stone-600">
                    Next payment {formatDate(b.next_payment_date)} — {formatPkr(b.next_payment_amount_pkr)}
                  </p>
                  <p className="text-sm">Construction: {proj?.progress_percent}%</p>
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
