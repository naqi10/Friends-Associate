import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { getBookingDesk, writeAuditLog } from "@/lib/data";
import { isStaff, permissionsFor } from "@/lib/permissions";
import { todayPk } from "@/lib/format";

/** Active bookings with their payment position, for the accounts office. */
export async function GET() {
  const user = await getSessionUser();
  const can = user && isStaff(user.role) ? await permissionsFor(user) : null;
  if (!user || !can || !can("bookings", "view") || !can("payments", "view")) {
    return NextResponse.json({ error: "You do not have permission to access this information." }, { status: 403 });
  }
  const today = todayPk();
  const { all } = await getBookingDesk(today);
  await writeAuditLog({ userId: user.id, action: "export", module: "bookings", newValue: { rows: all.length } });
  return csvResponse(
    `bookings-${today}.csv`,
    toCsv(
      ["Buyer", "Phone", "Property", "Project", "Total (PKR)", "Received (PKR)", "Outstanding (PKR)", "Collected %", "Next instalment (PKR)", "Next due", "Days overdue"],
      all.map((b) => [
        b.buyer.name,
        b.buyer.phone,
        b.property,
        b.project.name,
        b.totalPkr,
        b.paidPkr,
        b.outstandingPkr,
        b.totalPkr ? Math.round((b.paidPkr / b.totalPkr) * 100) : 0,
        b.daysUntil === null ? "" : b.nextAmountPkr,
        b.daysUntil === null ? "" : b.nextDate,
        b.daysUntil !== null && b.daysUntil < 0 ? -b.daysUntil : "",
      ]),
    ),
  );
}
