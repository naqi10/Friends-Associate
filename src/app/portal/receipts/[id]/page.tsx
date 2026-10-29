import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { PrintButton } from "@/components/PrintButton";
import { Receipt } from "@/components/Receipt";
import { getOffices, getPaymentReceipt } from "@/lib/data";
import { receiptLabel } from "@/lib/format";
import { permissionsFor } from "@/lib/permissions";
import { getPortal } from "@/lib/portal";

export const metadata = { title: "Receipt", robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

export default async function PortalReceiptPage({ params }: Props) {
  const { user } = await getPortal();
  const can = await permissionsFor(user);
  const { id } = await params;
  const payment = can("payments", "view") ? await getPaymentReceipt(id) : null;
  // Another buyer's receipt looks exactly like a missing one: no hint that the id exists.
  if (!payment || payment.userId !== user.id) notFound();
  const offices = await getOffices();

  return (
    <PortalShell title={`Receipt ${receiptLabel(payment.receiptNo)}`} back="/portal/payments#history">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/portal/payments#history" className="hidden text-[15px] text-muted hover:underline md:inline">
            ← All payments
          </Link>
          <PrintButton />
        </div>
        <div className="rounded-[24px] bg-paper p-2 ring-1 ring-line print:p-0 print:ring-0">
          <Receipt payment={payment} headOffice={offices[0]?.address} />
        </div>
      </div>
    </PortalShell>
  );
}
