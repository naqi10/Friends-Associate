import { cache } from "react";
import { prisma } from "../db";

const withProject = { project: { select: { slug: true, name: true, progressPercent: true } } } as const;

export async function getPublishedInvestments() {
  return prisma.investmentOpportunity.findMany({
    where: { published: true },
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
    include: withProject,
  });
}

export const getInvestmentBySlug = cache(async (slug: string) =>
  prisma.investmentOpportunity.findUnique({ where: { slug }, include: withProject }),
);

export async function getInvestmentById(id: string) {
  if (!id) return null;
  return prisma.investmentOpportunity.findUnique({ where: { id } });
}

export async function getInvestmentRows({ archived = false } = {}) {
  return prisma.investmentOpportunity.findMany({
    where: { archivedAt: archived ? { not: null } : null },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: { _count: { select: { leads: true } } },
  });
}

export type InvestmentInput = {
  slug: string;
  title: string;
  projectId: string | null;
  investmentType: string;
  city: string;
  location: string;
  summary: string;
  description: string;
  minimumInvestmentPkr: number;
  targetAmountPkr: number | null;
  expectedDuration: string;
  paymentStructure: string;
  returnsNote: string;
  status: string;
  published: boolean;
  sortOrder: number;
  imagePath?: string;
};

export async function saveInvestment(id: string | undefined, data: InvestmentInput) {
  if (id) {
    // An archived opportunity stays hidden until it is restored, whatever the edit form says.
    const archived = (await prisma.investmentOpportunity.findUnique({ where: { id }, select: { archivedAt: true } }))?.archivedAt;
    return prisma.investmentOpportunity.update({ where: { id }, data: archived ? { ...data, published: false } : data });
  }
  return prisma.investmentOpportunity.create({ data });
}

export async function investmentSlugTaken(slug: string, excludeId?: string) {
  return !!(await prisma.investmentOpportunity.findFirst({
    where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  }));
}

export async function getInvestmentsForProject(projectId: string) {
  return prisma.investmentOpportunity.findMany({
    where: { projectId, published: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, title: true, status: true, minimumInvestmentPkr: true },
  });
}
