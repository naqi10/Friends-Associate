import { prisma } from "../db";

export type PmStage = { id: string; name: string; percent: number; draftPercent: number | null; sortOrder: number };
export type PmProject = {
  id: string;
  slug: string;
  name: string;
  city: string;
  category: string;
  status: string;
  draftStatus: string | null;
  progressPercent: number;
  published: boolean;
  stages: PmStage[];
  hasDraft: boolean;
  draftUpdate: { id: string; text: string; photos: string[] } | null;
  lastPublishedAt: Date | null;
};

const parsePhotos = (json: string): string[] => {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

/** Average of the stage percentages (the "overall" figure), or the stored figure when there are no stages. */
export function overallPercent(stages: { percent: number }[], fallback: number) {
  return stages.length ? Math.round(stages.reduce((s, x) => s + x.percent, 0) / stages.length) : fallback;
}

export async function getPmProjects(): Promise<PmProject[]> {
  const rows = await prisma.project.findMany({
    where: { archivedAt: null },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      category: true,
      status: true,
      draftStatus: true,
      progressPercent: true,
      published: true,
      stages: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, percent: true, draftPercent: true, sortOrder: true } },
      updates: { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, text: true, photos: true, status: true, publishedAt: true } },
    },
  });
  return rows.map((p) => {
    const draft = p.updates.find((u) => u.status === "draft");
    const published = p.updates.find((u) => u.status === "published");
    return {
      ...p,
      updates: undefined,
      hasDraft: p.draftStatus !== null || p.stages.some((s) => s.draftPercent !== null) || !!draft,
      draftUpdate: draft ? { id: draft.id, text: draft.text, photos: parsePhotos(draft.photos) } : null,
      lastPublishedAt: published?.publishedAt ?? null,
    } as PmProject;
  });
}

/** Published site updates for buyers and the public project page. */
export async function getPublishedUpdates(projectIds: string[], take = 3) {
  if (!projectIds.length) return [];
  const rows = await prisma.projectUpdate.findMany({
    where: { projectId: { in: projectIds }, status: "published" },
    orderBy: { publishedAt: "desc" },
    take: take * projectIds.length,
    select: { id: true, projectId: true, text: true, photos: true, publishedAt: true },
  });
  return rows.map((u) => ({ ...u, photos: parsePhotos(u.photos) }));
}

export type PmSaveInput = {
  projectId: string;
  status: string;
  stages: { id: string; percent: number }[];
  text: string;
  newPhotos: string[];
  actorId: string;
};

/** "Save draft": keeps the PM's changes without buyers seeing them. */
export async function savePmDraft(input: PmSaveInput) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUniqueOrThrow({ where: { id: input.projectId }, include: { stages: true } });
    for (const s of project.stages) {
      const v = input.stages.find((x) => x.id === s.id);
      if (v) await tx.projectStage.update({ where: { id: s.id }, data: { draftPercent: v.percent === s.percent ? null : v.percent } });
    }
    await tx.project.update({ where: { id: project.id }, data: { draftStatus: input.status === project.status ? null : input.status } });
    const draft = await tx.projectUpdate.findFirst({ where: { projectId: project.id, status: "draft" }, orderBy: { createdAt: "desc" } });
    if (draft) {
      await tx.projectUpdate.update({ where: { id: draft.id }, data: { text: input.text, photos: JSON.stringify([...parsePhotos(draft.photos), ...input.newPhotos].slice(0, 12)) } });
    } else if (input.text || input.newPhotos.length) {
      await tx.projectUpdate.create({ data: { projectId: project.id, text: input.text, photos: JSON.stringify(input.newPhotos), createdById: input.actorId } });
    }
    return project;
  });
}

/** "Save & publish": stage values and status go live, the overall % becomes the stage average, the site update is published. */
export async function publishPm(input: PmSaveInput) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.project.findUniqueOrThrow({ where: { id: input.projectId }, include: { stages: { orderBy: { sortOrder: "asc" } } } });
    const stages = before.stages.map((s) => ({ ...s, percent: input.stages.find((x) => x.id === s.id)?.percent ?? s.percent }));
    for (const s of stages) await tx.projectStage.update({ where: { id: s.id }, data: { percent: s.percent, draftPercent: null } });
    const overall = overallPercent(stages, before.progressPercent);
    await tx.project.update({ where: { id: before.id }, data: { status: input.status, draftStatus: null, progressPercent: overall } });
    const draft = await tx.projectUpdate.findFirst({ where: { projectId: before.id, status: "draft" }, orderBy: { createdAt: "desc" } });
    const photos = [...(draft ? parsePhotos(draft.photos) : []), ...input.newPhotos].slice(0, 12);
    let update: { id: string } | null = null;
    if (draft) {
      update = await tx.projectUpdate.update({ where: { id: draft.id }, data: { text: input.text, photos: JSON.stringify(photos), status: "published", publishedAt: new Date() } });
    } else if (input.text || photos.length) {
      update = await tx.projectUpdate.create({
        data: { projectId: before.id, text: input.text, photos: JSON.stringify(photos), status: "published", publishedAt: new Date(), createdById: input.actorId },
      });
    }
    const current = stages.find((s) => s.percent < 100);
    return { before, overall, stages, current, update };
  });
}
