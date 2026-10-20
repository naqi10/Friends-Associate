import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { formatDate, formatPkr, overdueAmount, receiptLabel, todayPk } from "@/lib/format";
import { CANCELLED, getBookingsForUserDetailed, getPaymentsForUser, getSiteSettings, unitemisedPaid } from "@/lib/data";
import { requireUser } from "@/lib/require-user";
import { permissionsFor } from "@/lib/permissions";

export default async function PortalPaymentsPage() {
  const user = await requireUser(["buyer"]);
  const can = await permissionsFor(user);
  if (!can("payments", "view")) {
    return (
      <PortalShell title="Payments">
        <p className="rounded-md bg-stone-100 p-4 text-sm text-stone-700">
          This section is not available for your account. Please contact Friends Associates if you need access.
        </p>
      </PortalShell>
    );
  }
  const [bookings, payments, settings] = await Promise.all([
    getBookingsForUserDetailed(user.id),
    getPaymentsForUser(user.id),
    getSiteSettings(),
  ]);
  const today = todayPk();

  return (
    <PortalShell title="Payments">
      {settings.payment_gateway_enabled ? (
        <p className="text-sm text-stone-500">Online checkout (inactive in this phase).</p>
      ) : (
        <p className="rounded-md bg-stone-100 p-3 text-sm text-stone-700">
          Payments are recorded by Friends Associates staff after your bank transfer, cash or cheque is received. Each payment gets its own receipt
          below. There is no online checkout on this website.
        </p>
      )}
      {bookings.length === 0 && <p className="mt-6 text-sm text-stone-500">No payment records available.</p>}
      {bookings.map((b) => {
        const prop = b.property;
        const cancelled = b.status === CANCELLED;
        const pct = b.total_price_pkr > 0 ? Math.round((b.paid_pkr / b.total_price_pkr) * 100) : 0;
        const overdue = cancelled
          ? 0
          : overdueAmount({ outstandingPkr: b.outstanding_pkr, nextPaymentDate: b.next_payment_date, nextPaymentAmountPkr: b.next_payment_amount_pkr }, today);
        const history = payments.filter((p) => p.bookingId === b.id);
        const earlier = unitemisedPaid(b.paid_pkr, history);
        return (
          <section key={b.id} id={`b-${b.id}`} className="mt-6 scroll-mt-24 rounded-xl border bg-white p-4" aria-label={prop?.title}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-medium">{prop?.title}</h2>
              {cancelled && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">Booking cancelled</span>}
            </div>

            {overdue > 0 && (
              <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                Overdue: {formatPkr(overdue)} was due on {formatDate(b.next_payment_date)}. Please contact Friends Associates if you have already paid.
              </p>
            )}

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-stone-500">Total price</dt>
                <dd>{formatPkr(b.total_price_pkr)}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Total paid</dt>
                <dd>{formatPkr(b.paid_pkr)}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Outstanding</dt>
                <dd>{formatPkr(b.outstanding_pkr)}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Paid so far</dt>
                <dd>
                  {pct}%
                  <span className="mt-1 block h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-stone-200" aria-hidden>
                    <span className="block h-full bg-teal-700" style={{ width: `${pct}%` }} />
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Instalments</dt>
                <dd>
                  {b.payments_received} received / {b.payments_remaining} remaining
                </dd>
              </div>
              {!cancelled && b.outstanding_pkr > 0 && (
                <div>
                  <dt className="text-stone-500">Next payment</dt>
                  <dd>
                    {formatDate(b.next_payment_date)} — {formatPkr(b.next_payment_amount_pkr)}
                  </dd>
                </div>
              )}
            </dl>

            <h3 className="mt-6 text-sm font-semibold">Payment history</h3>
            {history.length === 0 && earlier === 0 ? (
              <p className="mt-2 text-sm text-stone-500">No payment records available.</p>
            ) : (
              <ul className="mt-2 divide-y divide-stone-100 text-sm">
                {history.map((p) => {
                  const reversed = p.status === "reversed";
                  return (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                      <div>
                        <p className={reversed ? "text-stone-400 line-through" : "font-medium"}>{formatPkr(p.amountPkr)}</p>
                        <p className="text-xs text-stone-500">
                          {formatDate(p.paidOn)} · {p.method}
                          {reversed && <span className="ml-1 font-semibold text-red-700">· Reversed</span>}
                        </p>
                      </div>
                      <Link href={`/portal/receipts/${p.id}`} className="font-mono text-xs text-teal-800 hover:underline">
                        Receipt {receiptLabel(p.receiptNo)} →
                      </Link>
                    </li>
                  );
                })}
                {earlier > 0 && (
                  <li className="py-3">
                    <p className="font-medium">{formatPkr(earlier)}</p>
                    <p className="text-xs text-stone-500">Earlier payments and amount paid at booking. Ask the office for copies of those receipts.</p>
                  </li>
                )}
              </ul>
            )}
          </section>
        );
      })}
    </PortalShell>
  );
}
