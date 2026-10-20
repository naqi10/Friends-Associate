"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LEAD_STATUSES, isKey, labelOf } from "@/lib/catalog";
import { addLeadActivity, assignUnassignedLeads, getAssignableStaff, getLead, updateLead, writeAuditLog } from "@/lib/data";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/permissions";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STAGES = LEAD_STATUSES.map((s) => s.key);

function text(formData: FormData, key: string, max = 300) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

/** Back to the Sales desk with the same filters (only /sales paths are accepted). */
function back(formData: FormData, param?: string): never {
  const r = text(formData, "return", 400);
  const base = /^\/sales(\?[A-Za-z0-9_\-=&.%+]*)?$/.test(r) ? r : "/sales";
  redirect(param ? `${base}${base.includes("?") ? "&" : "?"}${param}` : base);
}

async function loadLead(formData: FormData) {
  const lead = await getLead(text(formData, "id", 60));
  if (!lead) back(formData, "error=missing");
  return lead!;
}

async function applyStage(actorId: string, leadId: string, from: string, to: string) {
  const result = await updateLead(leadId, { status: to });
  await addLeadActivity(leadId, actorId, "status", `${labelOf(LEAD_STATUSES, from)} → ${labelOf(LEAD_STATUSES, to)}`);
  await writeAuditLog({ userId: actorId, action: "update", module: "leads", recordId: leadId, oldValue: result?.before, newValue: result?.after });
}

export async function setLeadStageAction(formData: FormData) {
  const { user } = await requireStaff("leads", "update");
  const lead = await loadLead(formData);
  const status = text(formData, "status", 40);
  if (!isKey(LEAD_STATUSES, status)) back(formData, "error=required");
  if (status !== lead.status) await applyStage(user.id, lead.id, lead.status, status);
  revalidatePath("/sales");
  back(formData, "saved=stage");
}

export async function nextStageAction(formData: FormData) {
  const { user } = await requireStaff("leads", "update");
  const lead = await loadLead(formData);
  const i = STAGES.indexOf(lead.status as (typeof STAGES)[number]);
  // "Converted" and "Closed" are end points: they are reached with their own buttons.
  const next = i >= 0 && i < STAGES.indexOf("follow_up") ? STAGES[i + 1] : null;
  if (!next) back(formData, "error=last-stage");
  await applyStage(user.id, lead.id, lead.status, next!);
  revalidatePath("/sales");
  back(formData, "saved=stage");
}

export async function assignLeadAction(formData: FormData) {
  const { user } = await requireStaff("leads", "update");
  const lead = await loadLead(formData);
  const to = text(formData, "assigned_to_id", 60) || null;
  const staff = await getAssignableStaff();
  const person = to ? staff.find((s) => s.id === to) : null;
  if (to && !person) back(formData, "error=assignee");
  const result = await updateLead(lead.id, { assignedToId: to });
  await addLeadActivity(lead.id, user.id, "assign", person ? `Assigned to ${person.name}` : "Unassigned");
  await writeAuditLog({ userId: user.id, action: "assign", module: "leads", recordId: lead.id, oldValue: result?.before, newValue: result?.after });
  revalidatePath("/sales");
  back(formData, "saved=assigned");
}

export async function setFollowUpAction(formData: FormData) {
  const { user } = await requireStaff("leads", "update");
  const lead = await loadLead(formData);
  const date = text(formData, "follow_up_date", 10);
  if (date && !(DATE_RE.test(date) && !Number.isNaN(Date.parse(date)))) back(formData, "error=date");
  const result = await updateLead(lead.id, { followUpDate: date || null });
  await addLeadActivity(lead.id, user.id, "followup", date ? `Follow-up set for ${date}` : "Follow-up date cleared");
  await writeAuditLog({ userId: user.id, action: "update", module: "leads", recordId: lead.id, oldValue: result?.before, newValue: result?.after });
  revalidatePath("/sales");
  back(formData, "saved=followup");
}

export async function addLeadNoteAction(formData: FormData) {
  const { user } = await requireStaff("leads", "update");
  const lead = await loadLead(formData);
  const note = text(formData, "note", 2000);
  if (note.length < 2) back(formData, "error=note");
  await addLeadActivity(lead.id, user.id, "note", note);
  revalidatePath("/sales");
  back(formData, "saved=note");
}

export async function closeLeadAction(formData: FormData) {
  const { user } = await requireStaff("leads", "update");
  const lead = await loadLead(formData);
  const reason = text(formData, "reason", 300);
  if (lead.status !== "closed") await applyStage(user.id, lead.id, lead.status, "closed");
  if (reason) await addLeadActivity(lead.id, user.id, "note", `Closed: ${reason}`);
  revalidatePath("/sales");
  back(formData, "saved=closed");
}

/** "Assign all": shares every unassigned open lead fairly across the sales team. */
export async function assignAllAction(formData: FormData) {
  const { user } = await requireStaff("leads", "update");
  const given = await assignUnassignedLeads();
  for (const g of given) {
    for (const id of g.leadIds) await addLeadActivity(id, user.id, "assign", `Assigned to ${g.name} (Assign all)`);
  }
  const total = given.reduce((s, g) => s + g.leadIds.length, 0);
  await writeAuditLog({ userId: user.id, action: "assign-all", module: "leads", newValue: given.map((g) => ({ to: g.name, count: g.leadIds.length })) });
  revalidatePath("/sales");
  back(formData, `saved=assigned-all&n=${total}`);
}

/** Bulk change for ticked rows: "assign:<userId|none>" or "status:<key>". */
export async function bulkLeadAction(formData: FormData) {
  const { user } = await requireStaff("leads", "update");
  const ids = formData.getAll("ids").map(String).filter((x) => /^[0-9a-zA-Z-]{1,60}$/.test(x)).slice(0, 200);
  const op = text(formData, "op", 80);
  if (!ids.length || !op) back(formData, "error=bulk");
  if (op.startsWith("status:")) {
    const status = op.slice(7);
    if (!isKey(LEAD_STATUSES, status)) back(formData, "error=bulk");
    const leads = await prisma.lead.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } });
    for (const l of leads) if (l.status !== status) await applyStage(user.id, l.id, l.status, status);
  } else if (op.startsWith("assign:")) {
    const to = op.slice(7) === "none" ? null : op.slice(7);
    const staff = await getAssignableStaff();
    const person = to ? staff.find((s) => s.id === to) : null;
    if (to && !person) back(formData, "error=assignee");
    await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { assignedToId: to } });
    for (const id of ids) await addLeadActivity(id, user.id, "assign", person ? `Assigned to ${person.name}` : "Unassigned");
    await writeAuditLog({ userId: user.id, action: "bulk-assign", module: "leads", newValue: { ids, to: person?.name ?? null } });
  } else back(formData, "error=bulk");
  revalidatePath("/sales");
  back(formData, `saved=bulk&n=${ids.length}`);
}
