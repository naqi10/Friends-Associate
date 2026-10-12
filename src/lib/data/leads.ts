import { prisma } from "../db";
import type { LeadSource, LeadStatus } from "../catalog";

export type NewLead = {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  interest: string;
  source: LeadSource;
  service?: string;
  location?: string;
  size?: string;
  budget?: string;
  message?: string;
  details?: Record<string, unknown>;
  propertyId?: string | null;
  projectId?: string | null;
  investmentId?: string | null;
};

export async function createLead(input: NewLead) {
  return prisma.lead.create({
    data: {
      name: input.name,
      phone: input.phone,
      email: input.email ?? "",
      city: input.city ?? "",
      interest: input.interest,
      status: "new",
      source: input.source,
      service: input.service ?? "",
      location: input.location ?? "",
      size: input.size ?? "",
      budget: input.budget ?? "",
      message: input.message ?? "",
      details: input.details ? JSON.stringify(input.details) : null,
      propertyId: input.propertyId ?? null,
      projectId: input.projectId ?? null,
      investmentId: input.investmentId ?? null,
    },
    select: { id: true },
  });
}

export type LeadRow = {
  id: string;
  name: string;
  phone: string;
  city: string;
  interest: string;
  status: LeadStatus;
  source: string;
  assignedTo: string | null;
  followUpDate: string | null;
  createdAt: string;
};

export async function getLeadRows(): Promise<LeadRow[]> {
  const rows = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 2000,
    include: { assignedTo: { select: { name: true } } },
  });
  return rows.map((l) => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    city: l.city,
    interest: l.interest,
    status: l.status as LeadStatus,
    source: l.source,
    assignedTo: l.assignedTo?.name ?? null,
    followUpDate: l.followUpDate,
    createdAt: l.createdAt.toISOString(),
  }));
}

export async function getLead(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true } },
      property: { select: { id: true, title: true } },
      project: { select: { slug: true, name: true } },
      investment: { select: { slug: true, title: true } },
    },
  });
}

export async function getLeadStatusCounts() {
  const rows = await prisma.lead.groupBy({ by: ["status"], _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Record<string, number>;
}

export async function getDueFollowUps(today: string) {
  return prisma.lead.count({ where: { followUpDate: { lte: today }, status: { notIn: ["converted", "closed"] } } });
}

export async function updateLead(
  id: string,
  data: Partial<{ status: string; assignedToId: string | null; followUpDate: string | null; notes: string }>,
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.lead.findUnique({ where: { id }, select: { status: true, assignedToId: true, followUpDate: true, notes: true } });
    if (!before) return null;
    const after = await tx.lead.update({ where: { id }, data, select: { status: true, assignedToId: true, followUpDate: true, notes: true } });
    return { before, after };
  });
}

export async function getAssignableStaff() {
  return prisma.user.findMany({
    where: { role: { in: ["sales", "admin"] }, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
