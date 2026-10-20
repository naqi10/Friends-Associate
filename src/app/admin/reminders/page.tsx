import Link from "next/link";
import { Icon } from "@/components/admin/shell/icons";
import { BRAND } from "@/lib/brand";
import { getDuePayments, type DueRow } from "@/lib/data";
import { formatDate, formatPkr } from "@/lib/format";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Payment reminders" };

/** Pakistani numbers in any common form ("0300-1234567", "+92 300 1234567") to wa.me format ("923001234567"). */
function waNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("92")) return digits;
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  return digits.length === 10 ? `92${digits}` : digits;
}

function message(r: DueRow) {
  const when = r.daysUntil < 0 ? `was due on ${formatDate(r.dueDate)}` : r.daysUntil === 0 ? "is due today" : `is due on ${formatDate(r.dueDate)}`;
  return (
    `Assalam-o-Alaikum ${r.customer},\n\n` +
    `This is a friendly reminder from ${BRAND.name} that your instalment of ${formatPkr(r.amountPkr)} for ${r.unit} ${when}.\n\n` +
    `If you have already paid, please share the receipt or reference so we can update your account. ` +
    `For any question call ${BRAND.phone}.\n\nShukriya.`
  );
}

function dueText(days: number) {
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function ReminderList({ items, empty }: { items: DueRow[]; empty: string }) {
  if (items.length === 0) return <p className="px-6 py-8 text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((r) => {
        const phone = waNumber(r.phone);
        return (
          <li key={r.bookingId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <Link href={`/admin/bookings/${r.bookingId}`} className="font-semibold hover:underline">
                {r.customer}
              </Link>
              <p className="text-sm text-body">
                {r.unit} · {formatPkr(r.amountPkr)} · {formatDate(r.dueDate)}
              </p>
              <p className={`text-xs font-semibold ${r.daysUntil < 0 ? "text-red-700" : "text-amber-800"}`}>{dueText(r.daysUntil)}</p>
            </div>
            {phone.length >= 11 ? (
              <a
                href={`https://wa.me/${phone}?text=${encodeURIComponent(message(r))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full bg-[#1f7a4d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#186640]"
              >
                <Icon name="whatsapp" className="h-4.5 w-4.5" /> Send on WhatsApp
              </a>
            ) : (
              <Link href={`/admin/customers/${r.customerId}`} className="text-sm font-medium text-red-700 underline">
                Add a phone number first
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default async function RemindersPage() {
  await requireStaff("bookings", "view");
  const rows = await getDuePayments(7);
  const overdue = rows.filter((r) => r.daysUntil < 0);
  const soon = rows.filter((r) => r.daysUntil >= 0);

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <h1 className="text-2xl font-semibold lg:text-[32px]">Payment reminders</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted lg:text-[15px]">
        Each button opens WhatsApp with a polite reminder already written; check it and press send. Automatic reminders are a Phase 2 module.
      </p>

      <section aria-labelledby="overdue" className="admin-card mt-6 overflow-hidden">
        <h2 id="overdue" className="border-b border-line px-6 py-4 text-lg font-semibold text-red-800">
          Overdue ({overdue.length})
        </h2>
        <ReminderList items={overdue} empty="Nothing overdue. Well done." />
      </section>

      <section aria-labelledby="soon" className="admin-card mt-6 overflow-hidden">
        <h2 id="soon" className="border-b border-line px-6 py-4 text-lg font-semibold">
          Due in the next 7 days ({soon.length})
        </h2>
        <ReminderList items={soon} empty="No instalments due in the next 7 days." />
      </section>
    </div>
  );
}
