"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addStage,
  deleteStage,
  getProjectById,
  getStage,
  notifyProjectBuyers,
  publishPm,
  savePmDraft,
  updateProjectProgress,
  updateStage,
  writeAuditLog,
} from "@/lib/data";
import { ImageError, saveImage } from "@/lib/images";
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

/* ---------- PM desk: stages, status, site update, draft / publish ---------- */

const MAX_UPDATE_PHOTOS = 6;

export async function savePmDeskAction(formData: FormData) {
  const { user } = await requireStaff("progress", "update");
  const projectId = String(formData.get("project_id") ?? "").slice(0, 60);
  const mode = formData.get("mode") === "draft" ? "draft" : "publish";
  const back = (code: string) => redirect(`/pm?p=${encodeURIComponent(projectId)}&error=${code}`);
  const project = await getProjectById(projectId);
  if (!project || project.archived_at) back("missing");

  const status = String(formData.get("status") ?? "").trim().slice(0, 60);
  if (!status) back("required");
  const stageIds = formData.getAll("stage_id").map(String);
  const stages: { id: string; percent: number }[] = [];
  for (const id of stageIds) {
    const n = Number(formData.get(`stage_${id}`));
    if (!Number.isInteger(n) || n < 0 || n > 100) back("stage");
    stages.push({ id, percent: n });
  }
  const text = String(formData.get("update_text") ?? "").trim().slice(0, 1000);

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_UPDATE_PHOTOS) back("photos");
  const newPhotos: string[] = [];
  for (const f of files) {
    try {
      newPhotos.push(await saveImage(f, "updates"));
    } catch (e) {
      if (e instanceof ImageError) back(e.code);
      throw e;
    }
  }

  const input = { projectId, status, stages, text, newPhotos, actorId: user.id };
  if (mode === "draft") {
    await savePmDraft(input);
    await writeAuditLog({ userId: user.id, action: "save-draft", module: "progress", recordId: projectId, newValue: { status, stages, text, photos: newPhotos.length } });
    revalidatePath("/pm");
    redirect(`/pm?p=${projectId}&saved=draft`);
  }

  const result = await publishPm(input);
  await writeAuditLog({
    userId: user.id,
    action: "publish",
    module: "progress",
    recordId: projectId,
    oldValue: { status: result.before.status, progress: result.before.progressPercent, stages: result.before.stages.map((s) => ({ name: s.name, percent: s.percent })) },
    newValue: { status, progress: result.overall, stages: result.stages.map((s) => ({ name: s.name, percent: s.percent })), update: !!result.update },
  });
  const notified = await notifyProjectBuyers(projectId, {
    type: "progress",
    title: `${project!.name} is now ${result.overall}% complete`,
    message: text || (result.current ? `Current stage: ${result.current.name} (${result.current.percent}%).` : "All stages are complete."),
    link: "/portal/progress",
  });
  revalidatePath("/pm");
  revalidatePath("/progress");
  revalidatePath(`/projects/${project!.slug}`);
  revalidatePath("/portal", "layout");
  revalidatePath("/");
  redirect(`/pm?p=${projectId}&saved=published&n=${notified}`);
}
