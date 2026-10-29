import Link from "next/link";
import { FormError } from "@/components/FormError";
import { Icon } from "@/components/admin/shell/icons";
import { PortalShell } from "@/components/PortalShell";
import { ProofForm } from "@/components/portal/ProofForm";
import { CARD, DueChip, SentNotice } from "@/components/portal/ui";
import { BRAND } from "@/lib/brand";
import { getHomeExtras, getOffices, getPaymentsForUser, unitemisedPaid } from "@/lib/data";
import { formatLacCr, formatLongDate, receiptLabel } from "@/lib/format";
import { permissionsFor } from "@/lib/permissions";
import { getPortal, nextInstalment, paidPercent } from "@/lib/portal";

export const metadata = { title: "Payments", robots: { index: false } };

type Props = { searchParams: Promise<{ sent?: string; error?: string; paid?: string }> };

export default async function PortalPaymentsPage({ searchParams }: Props) {
  const { user, bookings, active, today } = await getPortal();
  const can = await permissionsFor(user);
  if (!can("payments", "view")) {
    return (
      <PortalShell title="Payments">
        <p className="rounded-2xl bg-mist p-5 text-[16px]">This section is not available for your account. Please contact Friends Associates if you need access.</p>
      </PortalShell>
    );
  }
  const [sp, payments, offices, extras] = await Promise.all([searchParams, getPaymentsForUser(user.id), getOffices(), getHomeExtras()]);
  const only = bookings.length === 1 ? bookings[0] : undefined;

  return (
    <PortalShell title="Payments" subtitle={only?.property.title}>
      {bookings.length === 0 && <p className="rounded-2xl bg-mist p-5 text-[16px]">No payment records yet. They will appear here once your booking is confirmed.</p>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="space-y-6">
          {bookings.map((b) => {
            const pct = paidPercent(b);
            const inst = nextInstalment(b, today);
            const cancelled = !active.includes(b);
            return (
              <div key={b.id} id={`b-${b.id}`} className="scroll-mt-24 space-y-6">
                <section aria-label={`${b.property.title}: totals`} className={`${CARD} p-6`}>
                  {bookings.length > 1 && (
                    <p className="mb-3 text-[15px] font-semibold">
                      {b.property.title}
                      {cancelled && <span className="ml-2 rounded-full bg-mist px-2.5 py-0.5 text-[13px] font-normal text-muted">Booking cancelled</span>}
                    </p>
                  )}
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[16px] text-muted">Total price</p>
                    <p className="text-[28px] font-semibold tracking-tight">PKR {formatLacCr(b.total_price_pkr)}</p>
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-mist" role="progressbar" aria-label="Paid so far" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-[#0f6b6b]" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-[18px] bg-[#e3f0ef] p-4">
                      <p className="text-[15px] text-[#0f6b6b]">Paid · {pct}%</p>
                      <p className="text-[26px] font-semibold tracking-tight">{formatLacCr(b.paid_pkr)}</p>
                    </div>
                    <div className="rounded-[18px] bg-mist p-4">
                      <p className="text-[15px] text-muted">Remaining</p>
                      <p className="text-[26px] font-semibold tracking-tight">{formatLacCr(b.outstanding_pkr)}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-[15px] text-muted">
                    {b.payments_received} instalment{b.payments_received === 1 ? "" : "s"} paid · {b.payments_remaining} left
                  </p>
                </section>

                {inst && (
                  <section aria-label="Due now" className="rounded-[24px] bg-ink p-6 text-paper">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[16px] text-faint">{inst.overdue || inst.days === 0 ? "Due now" : "Next instalment"}</p>
                      <DueChip inst={inst} />
                    </div>
                    <p className="mt-3 text-[40px] leading-none font-semibold tracking-tight">PKR {inst.amount.toLocaleString("en-PK")}</p>
                    <p className="mt-3 text-[16px] text-faint">
                      {inst.overdue ? "Was due" : "Due on"} {formatLongDate(inst.date)}
                    </p>
                  </section>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-6 lg:row-span-2">
          <section id="how-to-pay" className={`${CARD} scroll-mt-24 p-6`}>
            <h2 className="mb-4 text-[22px] font-semibold">How to pay</h2>
            <p className="text-[16px] leading-relaxed text-body">
              Pay in cash or by cheque at any of our offices. You get a receipt for every payment, and it appears below in your payment history.
            </p>
            <ul className="mt-4 space-y-3">
              {offices.map((o) => (
                <li key={o.id} className="rounded-[18px] bg-mist p-4 text-[15px]">
                  <p className="font-semibold">{o.city}</p>
                  <p className="text-body">{o.address}</p>
                  {o.phone && <p className="mt-0.5 text-muted">{o.phone}</p>}
                </li>
              ))}
            </ul>
            {extras.hours && <p className="mt-3 text-[14px] text-muted">Open {extras.hours}.</p>}
            <a href={`tel:${BRAND.phoneIntl.replace(/\s/g, "")}`} className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-line-strong text-[16px] font-semibold hover:bg-mist">
              <Icon name="phone" className="h-5 w-5" /> Questions? Call {BRAND.phone}
            </a>
          </section>

          {active.length > 0 && (
            <section id="send-receipt" className="scroll-mt-24 space-y-3">
              {sp.sent === "receipt" && (
                <SentNotice>Receipt sent. Thank you! Our team will check it and update your balance, usually within one working day.</SentNotice>
              )}
              <FormError code={sp.error} />
              <ProofForm bookings={active.map((b) => ({ id: b.id, title: b.property.title }))} today={today} open={!!sp.paid || !!sp.error} />
            </section>
          )}
        </div>

        <section id="history" aria-label="Payment history" className={`${CARD} scroll-mt-24 p-6`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[22px] font-semibold">Payment history</h2>
            <p className="text-[15px] text-muted">{formatLacCr(bookings.reduce((s, b) => s + b.paid_pkr, 0))} received</p>
          </div>
          {bookings.map((b) => {
            const history = payments.filter((p) => p.bookingId === b.id);
            const earlier = unitemisedPaid(b.paid_pkr, history);
            return (
              <div key={b.id} className="mt-4">
                {bookings.length > 1 && <h3 className="mb-1 text-[15px] font-semibold text-muted">{b.property.title}</h3>}
                {history.length === 0 && earlier <= 0 ? (
                  <div className="rounded-[18px] bg-mist px-5 py-8 text-center text-[15px] text-muted">
                    <Icon name="receipt" className="mx-auto mb-2 h-7 w-7" />
                    Every payment gets its own receipt here once our office records it.
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {history.map((p) => {
                      const reversed = p.status === "reversed";
                      return (
                        <li key={p.id}>
                          <Link href={`/portal/receipts/${p.id}`} className="flex items-center gap-4 py-4 hover:bg-canvas">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mist">
                              <Icon name="receipt" className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={`block text-[17px] font-semibold ${reversed ? "text-muted line-through" : ""}`}>PKR {p.amountPkr.toLocaleString("en-PK")}</span>
                              <span className="block text-[14px] text-muted">
                                {formatLongDate(p.paidOn)} · {p.method}
                                {reversed && <span className="font-semibold text-red-700"> · Reversed</span>}
                              </span>
                            </span>
                            <span className="hidden font-mono text-[13px] text-muted sm:inline">{receiptLabel(p.receiptNo)}</span>
                            <Icon name="chevron" className="h-5 w-5 shrink-0 text-muted" />
                          </Link>
                        </li>
                      );
                    })}
                    {earlier > 0 && (
                      <li className="flex items-center gap-4 py-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mist">
                          <Icon name="history" className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block text-[17px] font-semibold">PKR {earlier.toLocaleString("en-PK")}</span>
                          <span className="block text-[14px] text-muted">Paid at booking and earlier. Ask our office for copies of those receipts.</span>
                        </span>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
          <p className="mt-4 text-[14px] text-muted">Open any payment to see, print or save its receipt as PDF. Receipts are always free.</p>
        </section>
      </div>
    </PortalShell>
  );
}
