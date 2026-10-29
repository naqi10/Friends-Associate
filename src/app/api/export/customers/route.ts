import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { getCustomerDirectory, writeAuditLog, type CustomerFilter } from "@/lib/data";
import { isStaff, permissionsFor } from "@/lib/permissions";
import { todayPk } from "@/lib/format";

/** Customers as CSV, with the list's filters. CNIC numbers are left out on purpose (not needed for office lists). */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role) || !(await permissionsFor(user))("users", "view")) {
    return NextResponse.json({ error: "You do not have permission to access this information." }, { status: 403 });
  }
  const sp = new URL(req.url).searchParams;
  const filter: CustomerFilter = {
    q: sp.get("q") ?? undefined,
    city: sp.get("city") ?? undefined,
    downloads: sp.get("downloads") === "unlocked" ? "unlocked" : sp.get("downloads") === "locked" ? "locked" : undefined,
    account: sp.get("account") === "disabled" ? "disabled" : sp.get("account") === "all" ? "all" : "active",
  };
  const today = todayPk();
  const { rows } = await getCustomerDirectory(filter, 1, today, 100_000);
  await writeAuditLog({ userId: user.id, action: "export", module: "customers", newValue: { rows: rows.length, filter } });
  return csvResponse(
    `customers-${today}.csv`,
    toCsv(
      ["Name", "Email", "Phone", "City", "Property", "Bookings", "Outstanding (PKR)", "Next due", "Overdue days", "Documents", "Account"],
      rows.map((c) => [
        c.name,
        c.email,
        c.phone,
        c.city,
        c.property ?? "",
        c.bookings,
        c.outstandingPkr,
        c.next?.date ?? "",
        c.next && c.next.daysUntil < 0 ? -c.next.daysUntil : "",
        c.unlocked ? "Visible" : "Not yet",
        c.active ? "Active" : "Disabled",
      ]),
    ),
  );
}
