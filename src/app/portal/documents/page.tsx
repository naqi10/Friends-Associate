import Link from "next/link";
import { Icon } from "@/components/admin/shell/icons";
import { PortalShell } from "@/components/PortalShell";
import { CARD } from "@/components/portal/ui";
import { CUSTOMER_PROOF_PREFIX, documentsVisible, isCustomerProof } from "@/lib/document-access";
import { getDocumentsForUser, getPaymentsForUser } from "@/lib/data";
import { daysBetween, formatLongDate, receiptLabel } from "@/lib/format";
import { permissionsFor } from "@/lib/permissions";
import { getPortal } from "@/lib/portal";

export const metadata = { title: "My documents", robots: { index: false } };

export default async function PortalDocumentsPage() {
  const { user, bookings, today } = await getPortal();
  const can = await permissionsFor(user);
  if (!can("documents", "view")) {
    return (
      <PortalShell title="My documents">
        <p className="rounded-2xl bg-mist p-5 text-[16px]">This section is not available for your account. Please contact Friends Associates if you need access.</p>
      </PortalShell>
    );
  }
  const [docs, payments] = await Promise.all([
    getDocumentsForUser(user.id),
    can("payments", "view") ? getPaymentsForUser(user.id) : Promise.resolve([]),
  ]);
  // Office documents show once the customer is confirmed: a booking with at least one payment received.
  const visible = documentsVisible(bookings);
  // Proofs the customer sent are listed apart; once staff check them they count as normal documents.
  const sentByYou = docs.filter(isCustomerProof);
  const fromOffice = visible ? docs.filter((d) => !isCustomerProof(d)) : [];
  const receipts = payments.filter((p) => p.status === "received");

  return (
    <PortalShell title="My documents" subtitle={visible ? `${fromOffice.length} document${fromOffice.length === 1 ? "" : "s"} · ready to download` : undefined}>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          {!visible ? (
            <section className={`${CARD} p-8 text-center`}>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mist">
                <Icon name="file" className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-[20px] font-semibold">Your documents will appear here</h2>
              <p className="mx-auto mt-1 max-w-md text-[16px] leading-relaxed text-body">
                Once your booking has its first payment, every document our office uploads for you shows here, ready to download.
              </p>
            </section>
          ) : (
          <section className={`${CARD} p-2 sm:p-3`} aria-labelledby="from-office">
            <h2 id="from-office" className="px-4 pt-4 pb-2 text-[20px] font-semibold">
              From Friends Associates
            </h2>
            {fromOffice.length === 0 ? (
              <div className="m-2 rounded-[18px] bg-mist px-5 py-10 text-center text-[16px] text-muted">
                <Icon name="file" className="mx-auto mb-2 h-8 w-8" />
                Your agreements, allocation letter and payment slips will appear here as soon as our office uploads them. You will get a notification and an email.
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {fromOffice.map((d) => {
                  const isNew = daysBetween(d.issued_on, today) <= 7;
                  return (
                    <li key={d.id} className="flex items-center gap-3 px-3 py-4 sm:gap-4 sm:px-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mist sm:h-12 sm:w-12">
                        <Icon name="file" className="h-5 w-5 sm:h-6 sm:w-6" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[17px] font-semibold">
                          {d.name.startsWith(CUSTOMER_PROOF_PREFIX) ? `Your payment proof · checked${d.name.replace(CUSTOMER_PROOF_PREFIX, "")}` : d.name}
                          {isNew && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 align-middle text-[12px] font-semibold text-emerald-800">New</span>}
                        </p>
                        <p className="text-[14px] text-muted">
                          {d.category !== d.name && `${d.category} · `}
                          {formatLongDate(d.issued_on)}
                          {!d.storage_path && <span className="sm:hidden"> · being prepared</span>}
                        </p>
                      </div>
                      {!d.storage_path ? (
                        <span className="hidden shrink-0 text-[14px] text-muted sm:inline">Being prepared</span>
                      ) : (
                        <a
                          href={`/api/documents/${d.id}/download`}
                          className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-[15px] font-semibold text-paper hover:bg-body"
                          aria-label={`Download ${d.name}`}
                        >
                          <Icon name="download" className="h-5 w-5" />
                          <span className="hidden sm:inline">Download</span>
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          )}

          {sentByYou.length > 0 && (
            <section className={`${CARD} p-2 sm:p-3`} aria-labelledby="sent-by-you">
              <h2 id="sent-by-you" className="px-4 pt-4 pb-2 text-[20px] font-semibold">
                Receipts you sent
              </h2>
              <ul className="divide-y divide-line">
                {sentByYou.map((d) => (
                  <li key={d.id} className="flex items-center gap-4 px-4 py-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-800">
                      <Icon name="clock" className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-semibold">{d.name.replace(`${CUSTOMER_PROOF_PREFIX} · `, "")}</p>
                      <p className="text-[14px] text-muted">Sent {formatLongDate(d.issued_on)} · our team is checking it</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className={`${CARD} p-6`} aria-labelledby="receipts">
            <h2 id="receipts" className="text-[20px] font-semibold">
              Payment receipts
            </h2>
            <p className="mt-1 text-[15px] text-muted">Free, always. Open one to print it or save it as PDF.</p>
            {receipts.length === 0 ? (
              <p className="mt-4 rounded-[18px] bg-mist p-4 text-[15px] text-muted">No receipts yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {receipts.slice(0, 6).map((p) => (
                  <li key={p.id}>
                    <Link href={`/portal/receipts/${p.id}`} className="flex items-center gap-3 py-3 hover:bg-canvas">
                      <Icon name="receipt" className="h-5 w-5 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-semibold">PKR {p.amountPkr.toLocaleString("en-PK")}</span>
                        <span className="block text-[13px] text-muted">
                          {formatLongDate(p.paidOn)} · {receiptLabel(p.receiptNo)}
                        </span>
                      </span>
                      <Icon name="chevron" className="h-5 w-5 shrink-0 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {receipts.length > 6 && (
              <Link href="/portal/payments#history" className="mt-3 inline-block text-[15px] font-medium text-teal-800 underline underline-offset-4">
                All {receipts.length} receipts →
              </Link>
            )}
          </section>

          <section className="rounded-[24px] bg-[#f3ece2] p-6">
            <h2 className="text-[18px] font-semibold">Need a document that is not here?</h2>
            <p className="mt-1 text-[15px] text-body">Ask our office and we will upload it to your portal.</p>
            <Link href="/portal/support" className="mt-4 inline-block text-[15px] font-semibold text-ink underline underline-offset-4">
              Contact support →
            </Link>
          </section>
        </aside>
      </div>
    </PortalShell>
  );
}
