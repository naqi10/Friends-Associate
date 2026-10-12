"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addStage,
  deleteStage,
  getProjectById,
  getStage,
  updateProjectProgress,
  updateStage,
  writeAuditLog,
} from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

export async function updateProgressAction(formData: FormData) {
  const { user: actor } = await requireStaff("progress", "update");
  const projectId = String(formData.get("projectId"));
  const status = String(formData.get("status") ?? "").trim().slice(0, 80);
  const before = await getProjectById(projectId);
  if (!before) return;
  // Overall % normally comes from the stages; a direct value is accepted only when provided.
  const raw = formData.get("progress");
  const progress = raw === null || raw === "" ? before.progress_percent : Number(raw);
  if (!Number.isFinite(progress)) return;
  const percent = Math.min(100, Math.max(0, Math.round(progress)));
  await updateProjectProgress(projectId, percent, status);
  await writeAuditLog({
    userId: actor.id,
    action: "update-progress",
    module: "progress",
    recordId: projectId,
    oldValue: { progress: before.progress_percent, status: before.status },
    newValue: { progress: percent, status: status || before.status },
  });
  revalidatePath("/pm");
  revalidatePath("/progress");
  revalidatePath("/portal");
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates a stage form. Returns null when the input is unusable. */
function readStage(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const percent = Number(formData.get("percent"));
  const targetDate = String(formData.get("target_date") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 200);
  if (!name || !Number.isInteger(percent) || percent < 0 || percent > 100) return null;
  if (targetDate && !(DATE_RE.test(targetDate) && !Number.isNaN(Date.parse(targetDate)))) return null;
  return { name, percent, targetDate: targetDate || null, note };
}

function refreshProgressViews(projectId: string) {
  revalidatePath(`/pm/${projectId}`);
  revalidatePath("/pm");
  revalidatePath("/progress");
  revalidatePath("/projects", "layout");
  revalidatePath("/portal", "layout");
}

export async function addStageAction(formData: FormData) {
  const { user: actor } = await requireStaff("progress", "add");
  const projectId = String(formData.get("projectId") ?? "");
  if (!(await getProjectById(projectId))) redirect("/pm?error=missing");
  const input = readStage(formData);
  if (!input) redirect(`/pm/${projectId}?error=stage`);
  const stage = await addStage(projectId, input);
  await writeAuditLog({ userId: actor.id, action: "add-stage", module: "progress", recordId: projectId, newValue: { stageId: stage.id, ...input } });
  refreshProgressViews(projectId);
  redirect(`/pm/${projectId}?saved=added`);
}

export async function updateStageAction(formData: FormData) {
  const { user: actor } = await requireStaff("progress", "update");
  const stageId = String(formData.get("stageId") ?? "");
  const existing = await getStage(stageId);
  if (!existing) redirect("/pm?error=missing");
  const input = readStage(formData);
  if (!input) redirect(`/pm/${existing.projectId}?error=stage`);
  const result = await updateStage(stageId, input);
  await writeAuditLog({ userId: actor.id, action: "update-stage", module: "progress", recordId: existing.projectId, oldValue: result?.before, newValue: result?.after });
  refreshProgressViews(existing.projectId);
  redirect(`/pm/${existing.projectId}?saved=updated`);
}

export async function deleteStageAction(formData: FormData) {
  const { user: actor } = await requireStaff("progress", "delete");
  const stageId = String(formData.get("stageId") ?? "");
  const removed = await deleteStage(stageId);
  if (!removed) redirect("/pm?error=missing");
  await writeAuditLog({ userId: actor.id, action: "delete-stage", module: "progress", recordId: removed.projectId, oldValue: removed });
  refreshProgressViews(removed.projectId);
  redirect(`/pm/${removed.projectId}?saved=deleted`);
}
