import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { addLeadActivity, getLead, updateLead, writeAuditLog } from "@/lib/data";
import { isStaff, permissionsFor } from "@/lib/permissions";
import { isSameOrigin } from "@/lib/public-guard";

const KINDS = { call: "Called", whatsapp: "Opened WhatsApp", email: "Opened email" } as const;

/**
 * Records a Call / WhatsApp / Email tap on a lead. The first contact moves a "New lead" to "Contacted",
 * so the pipeline stays honest without extra clicks.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const can = await permissionsFor(user);
  if (!can("leads", "view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let kind = "";
  try {
    kind = String(((await req.json()) as { kind?: unknown }).kind ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!(kind in KINDS)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const lead = await getLead((await params).id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await addLeadActivity(lead.id, user.id, kind, KINDS[kind as keyof typeof KINDS]);
  let status = lead.status;
  if (lead.status === "new" && can("leads", "update")) {
    const result = await updateLead(lead.id, { status: "contacted" });
    await addLeadActivity(lead.id, user.id, "status", "New lead → Contacted (first contact)");
    await writeAuditLog({ userId: user.id, action: "update", module: "leads", recordId: lead.id, oldValue: result?.before, newValue: result?.after });
    status = "contacted";
  }
  return NextResponse.json({ ok: true, status });
}
