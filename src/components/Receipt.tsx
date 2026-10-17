import { BRAND } from "@/lib/brand";
import type { getPaymentReceipt } from "@/lib/data";
import { formatDate, receiptLabel, rupeesInWords } from "@/lib/format";

type ReceiptData = NonNullable<Awaited<ReturnType<typeof getPaymentReceipt>>>;

/** Printable payment receipt. Shown to the owning buyer and to staff with Payments → View. */
export function Receipt({ payment, headOffice }: { payment: ReceiptData; headOffice?: string }) {
  const reversed = payment.status === "reversed";
  const rows: [string, string][] = [
    ["Received from", payment.user.name],
    ...(payment.user.cnic ? ([["CNIC", payment.user.cnic]] as [string, string][]) : []),
    ["Property", `${payment.booking.property.title} (${payment.booking.property.type}, ${payment.booking.property.size})`],
    ["Project", `${payment.booking.project.name}, ${payment.booking.project.city}`],
    ["Payment date", formatDate(payment.paidOn)],
    ["Method", payment.method],
    ...(payment.referenceNumber ? ([["Reference / cheque no.", payment.referenceNumber]] as [string, string][]) : []),
    ...(payment.remarks ? ([["Remarks", payment.remarks]] as [string, string][]) : []),
  ];

  return (
    <article className="relative overflow-hidden rounded-xl border border-line bg-white p-6 sm:p-8 print:border-0 print:p-0">
      {reversed && (
        <p
          aria-label="This receipt was reversed"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-lg border-4 border-red-600 px-6 py-2 text-4xl font-bold tracking-widest text-red-600 opacity-70"
        >
          REVERSED
        </p>
      )}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="font-serif text-2xl text-ink">{BRAND.name}</p>
          <p className="text-xs text-muted">{BRAND.tagline}</p>
          <p className="mt-1 text-xs text-muted">
            {headOffice ?? BRAND.city} · {BRAND.phone} · {BRAND.domain}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Payment receipt</p>
          <p className="mt-1 font-mono text-lg font-semibold text-ink">{receiptLabel(payment.receiptNo)}</p>
        </div>
      </header>

      <div className="mt-6 rounded-lg bg-mist p-4">
        <p className="text-xs text-muted">Amount received</p>
        <p className="mt-1 text-2xl font-semibold text-ink">PKR {payment.amountPkr.toLocaleString("en-PK")}</p>
        <p className="mt-1 text-sm text-body">{rupeesInWords(payment.amountPkr)}</p>
      </div>

      <dl className="mt-6 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[12rem_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      {reversed && (
        <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-800">
          This payment was reversed{payment.reversedAt ? ` on ${formatDate(payment.reversedAt.toISOString())}` : ""}
          {payment.reversalReason ? `: ${payment.reversalReason.replace(/[.\s]+$/, "")}.` : "."} It is not counted in the amount paid.
        </p>
      )}

      <footer className="mt-8 flex flex-wrap justify-between gap-4 border-t border-line pt-4 text-xs text-muted">
        <p>Recorded by {payment.createdBy?.name ?? "Friends Associates"} on {formatDate(payment.createdAt.toISOString())}</p>
        <p>Computer-generated receipt. No signature required.</p>
      </footer>
    </article>
  );
}
