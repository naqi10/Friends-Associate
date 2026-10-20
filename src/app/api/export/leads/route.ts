import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { LEAD_SOURCES, LEAD_STATUSES, labelOf } from "@/lib/catalog";
import { csvResponse, toCsv } from "@/lib/csv";
import { getLeadPage, writeAuditLog } from "@/lib/data";
import { isStaff, permissionsFor } from "@/lib/permissions";
import { todayPk } from "@/lib/format";

/** Leads as CSV, with the same filters as the Sales desk. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role) || !(await permissionsFor(user))("leads", "view")) {
    return NextResponse.json({ error: "You do not have permission to access this information." }, { status: 403 });
  }
  const sp = new URL(req.url).searchParams;
  const filter = {
    status: sp.get("status") ?? undefined,
    q: sp.get("q") ?? undefined,
    source: sp.get("source") ?? undefined,
    city: sp.get("city") ?? undefined,
    assigned: sp.get("assigned") ?? undefined,
    meId: user.id,
  };
  const { rows } = await getLeadPage(filter, 1, 10_000);
  await writeAuditLog({ userId: user.id, action: "export", module: "leads", newValue: { rows: rows.length, filter } });
  return csvResponse(
    `leads-${todayPk()}.csv`,
    toCsv(
      ["Name", "Phone", "Email", "City", "Interest", "Stage", "Source", "Assigned to", "Next follow-up", "Received"],
      rows.map((l) => [
        l.name,
        l.phone,
        l.email,
        l.city,
        l.interest,
        labelOf(LEAD_STATUSES, l.status),
        labelOf(LEAD_SOURCES, l.source),
        l.assignedTo?.name ?? "",
        l.followUpDate ?? "",
        l.createdAt.toISOString().slice(0, 10),
      ]),
    ),
  );
}
