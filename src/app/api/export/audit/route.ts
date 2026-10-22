import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { AREAS, describe } from "@/lib/audit-describe";
import { csvResponse, toCsv } from "@/lib/csv";
import { getAuditFeed, writeAuditLog } from "@/lib/data";
import { todayPk } from "@/lib/format";

/** Audit log as CSV (admins only), with the page's person / area filters. Secrets are never in the log to begin with. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "You do not have permission to access this information." }, { status: 403 });
  }
  const sp = new URL(req.url).searchParams;
  const who = sp.get("who") || undefined;
  const area = sp.get("area") || undefined;
  const rows = await getAuditFeed({ who, area, take: 10_000 });
  await writeAuditLog({ userId: user.id, action: "export", module: "audit", newValue: { rows: rows.length, who: who ?? null, area: area ?? null } });
  const today = todayPk();
  return csvResponse(
    `audit-log-${today}.csv`,
    toCsv(
      ["Time (Pakistan)", "Person", "Area", "Area code", "What happened", "Action", "Record", "Before", "After"],
      rows.map((r) => [
        r.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Karachi" }),
        r.user?.name ?? "Deleted user",
        AREAS[r.module]?.label ?? r.module,
        r.module,
        describe(r).parts.map((p) => p.text).join(""),
        r.action,
        r.recordId ?? "",
        r.oldValue ?? "",
        r.newValue ?? "",
      ]),
    ),
  );
}
