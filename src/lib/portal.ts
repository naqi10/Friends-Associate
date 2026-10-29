import { cache } from "react";
import { CANCELLED, getBookingsForUserDetailed, unreadNotificationCount, type BookingWithRelations } from "@/lib/data";
import { daysBetween, todayPk } from "@/lib/format";
import { requireUser } from "@/lib/require-user";

export type Instalment = { amount: number; date: string; overdue: boolean; days: number };

/** The next instalment of a booking, or null when nothing is left to pay (or the booking is cancelled). */
export function nextInstalment(b: BookingWithRelations, today: string): Instalment | null {
  if (b.status === CANCELLED || b.outstanding_pkr <= 0 || !b.next_payment_date) return null;
  const days = daysBetween(today, b.next_payment_date);
  return { amount: Math.min(b.next_payment_amount_pkr, b.outstanding_pkr), date: b.next_payment_date, overdue: days < 0, days: Math.abs(days) };
}

export function paidPercent(b: BookingWithRelations) {
  return b.total_price_pkr > 0 ? Math.min(100, Math.round((b.paid_pkr / b.total_price_pkr) * 100)) : 0;
}

/** "BH" from "Bilal Hussain". */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/**
 * Everything the portal frame and most pages need, loaded once per request: the signed-in buyer, their
 * bookings (newest first), unread notifications and whether any instalment is late.
 */
export const getPortal = cache(async () => {
  const user = await requireUser(["buyer"]);
  const [bookings, unread] = await Promise.all([getBookingsForUserDetailed(user.id), unreadNotificationCount(user.id)]);
  const today = todayPk();
  const active = bookings.filter((b) => b.status !== CANCELLED);
  const overdue = active.some((b) => nextInstalment(b, today)?.overdue);
  return { user, bookings, active, unread, today, overdue };
});
