import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { Receipt } from "@/components/Receipt";
import { getOffices, getPaymentReceipt } from "@/lib/data";
import { receiptLabel } from "@/lib/format";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Receipt", robots: { index: false } };

type Props = { params: Promise<{ id: string; paymentId: string }> };

export default async function AdminReceiptPage({ params }: Props) {
  await requireStaff("payments", "view");
  const { id, paymentId } = await params;
  const [payment, offices] = await Promise.all([getPaymentReceipt(paymentId), getOffices()]);
  // The booking id in the address must match, so a receipt is only reachable from its own booking.
  if (!payment || payment.bookingId !== id) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/admin/bookings/${id}`} className="text-sm text-stone-600 hover:underline">
          ← Back to booking
        </Link>
        <PrintButton />
      </div>
      <h1 className="sr-only">Receipt {receiptLabel(payment.receiptNo)}</h1>
      <Receipt payment={payment} headOffice={offices[0]?.address} />
    </div>
  );
}
