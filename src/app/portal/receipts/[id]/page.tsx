import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { PrintButton } from "@/components/PrintButton";
import { Receipt } from "@/components/Receipt";
import { getOffices, getPaymentReceipt } from "@/lib/data";
import { receiptLabel } from "@/lib/format";
import { permissionsFor } from "@/lib/permissions";
import { requireUser } from "@/lib/require-user";

export const metadata = { title: "Receipt", robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

export default async function PortalReceiptPage({ params }: Props) {
  const user = await requireUser(["buyer"]);
  const can = await permissionsFor(user);
  const { id } = await params;
  const payment = can("payments", "view") ? await getPaymentReceipt(id) : null;
  // Another buyer's receipt looks exactly like a missing one: no hint that the id exists.
  if (!payment || payment.userId !== user.id) notFound();
  const offices = await getOffices();

  return (
    <PortalShell title={`Receipt ${receiptLabel(payment.receiptNo)}`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/portal/payments" className="text-sm text-stone-600 hover:underline">
          ← All payments
        </Link>
        <PrintButton />
      </div>
      <Receipt payment={payment} headOffice={offices[0]?.address} />
    </PortalShell>
  );
}
