import type { Prisma } from "@prisma/client";
import { prisma } from "../db";

export type StageInput = { name: string; percent: number; targetDate: string | null; note: string };

/** Overall project progress = average of its stages, so the headline % always matches the breakdown. */
async function recompute(tx: Prisma.TransactionClient, projectId: string) {
  const agg = await tx.projectStage.aggregate({ where: { projectId }, _avg: { percent: true } });
  await tx.project.update({ where: { id: projectId }, data: { progressPercent: Math.round(agg._avg.percent ?? 0) } });
}

export async function addStage(projectId: string, input: StageInput) {
  return prisma.$transaction(async (tx) => {
    const last = await tx.projectStage.aggregate({ where: { projectId }, _max: { sortOrder: true } });
    const stage = await tx.projectStage.create({ data: { projectId, ...input, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    await recompute(tx, projectId);
    return stage;
  });
}

export async function updateStage(stageId: string, input: StageInput) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.projectStage.findUnique({ where: { id: stageId } });
    if (!before) return null;
    const after = await tx.projectStage.update({ where: { id: stageId }, data: input });
    await recompute(tx, before.projectId);
    return { before, after };
  });
}

export async function deleteStage(stageId: string) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.projectStage.findUnique({ where: { id: stageId } });
    if (!before) return null;
    await tx.projectStage.delete({ where: { id: stageId } });
    await recompute(tx, before.projectId);
    return before;
  });
}

export async function getStage(stageId: string) {
  return prisma.projectStage.findUnique({ where: { id: stageId }, select: { id: true, projectId: true } });
}
