import Link from "next/link";
import { Icon } from "@/components/admin/shell/icons";
import { notFound } from "next/navigation";
import { FormError } from "@/components/FormError";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Field, Notice, SelectField } from "@/components/admin/Field";
import { cancelBookingAction } from "@/lib/actions/lifecycle";
import { recordPaymentAction, reversePaymentAction, updateBookingAction } from "@/lib/actions/bookings";
import { PAYMENT_METHODS } from "@/lib/catalog";
import { CANCELLED, getBooking, getPaymentsForBooking, unitemisedPaid } from "@/lib/data";
import { formatDate, formatPkr, overdueAmount, receiptLabel, todayPk } from "@/lib/format";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Booking" };

const SAVED: Record<string, string> = {
  created: "Booking created and the unit marked Booked. The buyer can see it in their portal now.",
  updated: "Booking saved.",
  payment: "Payment recorded with its own receipt. Paid, outstanding and instalments were updated, and the buyer can see it in their portal.",
  cancelled: "Booking cancelled. The unit is back on sale; the booking and its payments are kept as history.",
  reversed: "Payment reversed. The receipt is kept and marked REVERSED; paid and outstanding were put back.",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; receipt?: string }>;
};

export default async function BookingDetailPage({ params, searchParams }: Props) {
  const { can } = await requireStaff("bookings", "view");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const b = await getBooking(id);
  if (!b) notFound();
  const canSeePayments = can("payments", "view");
  const payments = canSeePayments ? await getPaymentsForBooking(b.id) : [];
  const earlier = unitemisedPaid(b.paidPkr, payments);
  const today = todayPk();
  const cancelled = b.status === CANCELLED;
  const overdue = cancelled ? 0 : overdueAmount(b, today);
  const pct = b.totalPricePkr > 0 ? Math.round((b.paidPkr / b.totalPricePkr) * 100) : 0;

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <Link href="/admin/bookings" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-medium text-body hover:border-ink hover:text-ink">
        ← All bookings
      </Link>
      <h1 className="mt-5 text-[32px] leading-tight font-semibold tracking-tight lg:text-[44px]">{b.property.title}</h1>
      <p className="mt-1.5 text-[15px] text-muted">
        {b.project.name} · Buyer{" "}
        <Link href={`/admin/customers/${b.user.id}`} className="text-teal-800 hover:underline">
          {b.user.name}
        </Link>{" "}
        · Booked {formatDate(b.bookedOn)}
      </p>
      <Notice message={sp.saved ? SAVED[sp.saved] : undefined} />
      {sp.saved === "payment" && sp.receipt && (
        <p className="mt-2 text-sm">
          <Link href={`/admin/bookings/${b.id}/receipts/${sp.receipt}`} className="font-medium text-teal-800 hover:underline">
            Open the receipt to print or share →
          </Link>
        </p>
      )}
      <FormError code={sp.error} />
      {cancelled && (
        <p className="mt-4 rounded-md bg-stone-100 p-3 text-sm text-stone-700">
          Cancelled{b.cancelledAt ? ` on ${formatDate(b.cancelledAt.toISOString())}` : ""}
          {b.cancelReason ? `: ${b.cancelReason.replace(/[.\s]+$/, "")}.` : "."} The figures below are kept as they were at cancellation. Any refund is
          handled outside the system.
        </p>
      )}

      {/* Same stat cards as the Bookings & payments list. */}
      <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total price", value: formatPkr(b.totalPricePkr), tone: "" },
          { label: "Paid", value: formatPkr(b.paidPkr), tone: "" },
          { label: "Outstanding", value: formatPkr(b.outstandingPkr), tone: "dark" },
          { label: "Paid so far", value: `${pct}%`, tone: "", bar: true },
        ].map((s) => (
          <div key={s.label} className={`rounded-[24px] p-5 lg:p-6 ${s.tone === "dark" ? "bg-ink text-paper" : "admin-card"}`}>
            <dt className={`text-sm ${s.tone === "dark" ? "text-faint" : "text-muted"}`}>{s.label}</dt>
            <dd className="mt-2 text-[22px] leading-none font-semibold tracking-tight whitespace-nowrap sm:text-[28px]">{s.value}</dd>
            {s.bar && (
              <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-mist" aria-hidden>
                <span className="block h-full rounded-full bg-teal-700" style={{ width: `${pct}%` }} />
              </span>
            )}
          </div>
        ))}
      </dl>

      {overdue > 0 && (
        <p className="mt-4 flex items-center gap-3 rounded-[20px] border border-red-200 bg-red-50 px-5 py-4 text-[15px] text-red-800">
          <Icon name="alert" className="h-5 w-5 shrink-0" />
          <span>
            <b>Overdue:</b> {formatPkr(overdue)} was due on {formatDate(b.nextPaymentDate)}.
          </span>
        </p>
      )}

      <section id="pay" className="mt-6 scroll-mt-24 admin-card p-6">
        <h2 className="font-semibold">Record a received payment</h2>
        <p className="mt-1 text-sm text-stone-600">
          Use this after a bank transfer, cash or cheque clears. It creates a numbered receipt, adds to Paid, reduces Outstanding and moves one
          instalment from remaining to received.
        </p>
        {!can("payments", "add") ? (
          <p className="mt-3 text-sm text-stone-500">You do not have permission to record payments.</p>
        ) : cancelled ? (
          <p className="mt-3 text-sm text-stone-500">This booking is cancelled. Payments cannot be recorded.</p>
        ) : b.outstandingPkr === 0 ? (
          <p className="mt-3 text-sm text-teal-800">Fully paid. No balance outstanding.</p>
        ) : (
          <form action={recordPaymentAction} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={b.id} />
            <Field
              label="Amount (PKR)"
              name="amount_pkr"
              type="number"
              min={1}
              max={b.outstandingPkr}
              step={1}
              defaultValue={Math.min(b.nextPaymentAmountPkr, b.outstandingPkr) || undefined}
              hint={`Outstanding: ${formatPkr(b.outstandingPkr)}`}
              required
            />
            <Field label="Date received" name="paid_on" type="date" max={today} defaultValue={today} required />
            <SelectField label="Method" name="method" options={PAYMENT_METHODS} required />
            <Field label="Reference / cheque number" name="reference_number" maxLength={80} hint="Required for bank transfers and cheques." />
            <div className="sm:col-span-2">
              <Field label="Remarks (optional)" name="remarks" maxLength={500} hint="Printed on the receipt, e.g. 8th quarterly instalment." />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
                Record payment
              </button>
            </div>
          </form>
        )}
      </section>

      {canSeePayments && (
        <section className="mt-6 admin-card p-6">
          <h2 className="font-semibold">Payment history</h2>
          {payments.length === 0 && earlier === 0 ? (
            <p className="mt-3 text-sm text-stone-500">No payment records available.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b text-stone-500">
                    <th className="py-2 pr-3">Receipt</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Method</th>
                    <th className="py-2 pr-3">Reference</th>
                    <th className="py-2 pr-3">Recorded by</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const reversed = p.status === "reversed";
                    return (
                      <tr key={p.id} className={`border-b border-stone-100 align-top ${reversed ? "text-stone-400" : ""}`}>
                        <td className="py-2 pr-3 font-mono">
                          <Link href={`/admin/bookings/${b.id}/receipts/${p.id}`} className="text-teal-800 hover:underline">
                            {receiptLabel(p.receiptNo)}
                          </Link>
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">{formatDate(p.paidOn)}</td>
                        <td className={`py-2 pr-3 whitespace-nowrap ${reversed ? "line-through" : ""}`}>{formatPkr(p.amountPkr)}</td>
                        <td className="py-2 pr-3">{p.method}</td>
                        <td className="py-2 pr-3">{p.referenceNumber || "—"}</td>
                        <td className="py-2 pr-3">{p.recordedBy ?? "—"}</td>
                        <td className="py-2">
                          {reversed ? (
                            <span title={p.reversalReason} className="text-xs font-semibold text-red-700">
                              Reversed
                            </span>
                          ) : can("payments", "update") ? (
                            <details>
                              <summary className="cursor-pointer text-xs font-medium text-red-700">Reverse…</summary>
                              <form action={reversePaymentAction} className="mt-2 w-56 space-y-2">
                                <input type="hidden" name="booking_id" value={b.id} />
                                <input type="hidden" name="payment_id" value={p.id} />
                                <Field label="Reason" name="reason" minLength={5} maxLength={300} required placeholder="e.g. Cheque bounced" />
                                <button type="submit" className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800">
                                  Reverse payment
                                </button>
                              </form>
                            </details>
                          ) : (
                            <span className="text-xs text-stone-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {earlier !== 0 && (
                    <tr className="text-stone-600">
                      <td className="py-2 pr-3">—</td>
                      <td className="py-2 pr-3 whitespace-nowrap">Up to {formatDate(b.bookedOn)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{formatPkr(earlier)}</td>
                      <td className="py-2 pr-3" colSpan={4}>
                        {earlier > 0
                          ? "Earlier payments and amount paid at booking (no itemised receipt)"
                          : "Manual correction: the paid figure was lowered by hand"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {can("bookings", "update") && !cancelled && (
        <section className="mt-6 admin-card p-6">
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
              hint={
                can("payments", "update")
                  ? "Outstanding is recalculated from the total price. To add a payment, use Record payment above so it gets a receipt."
                  : "Changing the paid amount needs Payments → Edit."
              }
            />
            <Field label="Instalments received" name="payments_received" type="number" min={0} step={1} defaultValue={b.paymentsReceived} required />
            <Field label="Instalments remaining" name="payments_remaining" type="number" min={0} step={1} defaultValue={b.paymentsRemaining} required />
            <Field label="Next payment date" name="next_payment_date" type="date" defaultValue={b.nextPaymentDate} required />
            <Field label="Next payment amount (PKR)" name="next_payment_amount_pkr" type="number" min={0} step={1} defaultValue={b.nextPaymentAmountPkr} required />
            <div className="sm:col-span-2">
              <button type="submit" className="rounded-full border-[1.5px] border-line-strong bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-mist">
                Save changes
              </button>
            </div>
          </form>
        </section>
      )}

      {can("bookings", "delete") && !cancelled && (
        <section className="mt-6 rounded-[28px] border-2 border-red-200 bg-white shadow-[0_18px_40px_-18px_rgb(14_14_14/0.28)] p-6">
          <h2 className="font-semibold text-red-800">Cancel this booking</h2>
          <p className="mt-1 text-sm text-stone-600">
            Use this when the sale falls through. The unit goes back on sale and the buyer sees the booking as cancelled. Nothing is deleted: the
            booking and all {payments.length} recorded payment{payments.length === 1 ? "" : "s"} stay on record. Refunds are handled outside the system.
          </p>
          <form action={cancelBookingAction} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={b.id} />
            <Field label="Reason" name="reason" minLength={5} maxLength={300} required placeholder="e.g. Buyer withdrew; refund agreed" />
            <ConfirmButton message={`Cancel the booking of ${b.property.title} for ${b.user.name}? The unit goes back on sale.`}>
              Cancel booking
            </ConfirmButton>
          </form>
        </section>
      )}
    </div>
  );
}
