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
      property: { select: { id: true, slug: true, title: true } },
      project: { select: { slug: true, name: true } },
      investment: { select: { slug: true, title: true } },
      convertedUser: { select: { id: true, name: true } },
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

/* ---------- Sales desk (filters, attention, history, assignment) ---------- */

export const OPEN_LEAD = { status: { notIn: ["converted", "closed"] } };

export type LeadFilter = {
  status?: string;
  q?: string;
  source?: string;
  city?: string;
  /** "unassigned", "me", or a staff user id. */
  assigned?: string;
  meId?: string;
};

function leadWhere(f: LeadFilter) {
  const q = f.q?.trim();
  const assigned =
    f.assigned === "unassigned" ? { assignedToId: null } : f.assigned === "me" ? { assignedToId: f.meId ?? "-" } : f.assigned ? { assignedToId: f.assigned } : {};
  return {
    ...(f.status ? { status: f.status } : {}),
    ...(f.source ? { source: f.source } : {}),
    ...(f.city ? { city: { equals: f.city, mode: "insensitive" as const } } : {}),
    ...assigned,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
            { email: { contains: q, mode: "insensitive" as const } },
            { interest: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export type DeskLead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  interest: string;
  status: string;
  source: string;
  followUpDate: string | null;
  createdAt: Date;
  assignedTo: { id: string; name: string } | null;
};

export async function getLeadPage(f: LeadFilter, page: number, pageSize = 25) {
  const where = leadWhere(f);
  const [total, rows] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        city: true,
        interest: true,
        status: true,
        source: true,
        followUpDate: true,
        createdAt: true,
        assignedTo: { select: { id: true, name: true } },
      },
    }),
  ]);
  return { rows: rows as DeskLead[], total, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Status counts for the tabs, using the same filters except status. */
export async function getLeadCounts(f: LeadFilter) {
  const rows = await prisma.lead.groupBy({ by: ["status"], where: leadWhere({ ...f, status: undefined }), _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Record<string, number>;
}

/** What needs a salesperson's attention right now (open leads only). */
export async function getLeadAttention(today: string) {
  const [unassigned, noDate, oldestNew, dueToday] = await Promise.all([
    prisma.lead.count({ where: { ...OPEN_LEAD, assignedToId: null } }),
    prisma.lead.count({ where: { status: "follow_up", followUpDate: null } }),
    prisma.lead.findFirst({ where: { status: "new" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.lead.count({ where: { ...OPEN_LEAD, followUpDate: { lte: today } } }),
  ]);
  const waitingDays = oldestNew ? Math.floor((Date.now() - oldestNew.createdAt.getTime()) / 86_400_000) : 0;
  return { unassigned, noDate, waitingDays, dueToday };
}

export async function getLeadCities() {
  const rows = await prisma.lead.findMany({ where: { city: { not: "" } }, distinct: ["city"], select: { city: true }, orderBy: { city: "asc" } });
  return rows.map((r) => r.city);
}

export async function getLeadActivities(leadId: string) {
  return prisma.leadActivity.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, kind: true, text: true, createdAt: true, user: { select: { name: true } } },
  });
}

export async function addLeadActivity(leadId: string, userId: string | null, kind: string, text = "") {
  return prisma.leadActivity.create({ data: { leadId, userId, kind, text: text.slice(0, 2000) } });
}

/**
 * Shares unassigned open leads fairly: each goes to the salesperson with the fewest open leads at that
 * moment (sales role first; admins only if there is no active salesperson). Returns who got how many.
 */
export async function assignUnassignedLeads() {
  const sales = await prisma.user.findMany({ where: { role: "sales", active: true }, select: { id: true, name: true } });
  const pool = sales.length ? sales : await prisma.user.findMany({ where: { role: "admin", active: true }, select: { id: true, name: true } });
  if (!pool.length) return [];
  const loads = new Map<string, number>();
  for (const p of pool) loads.set(p.id, await prisma.lead.count({ where: { ...OPEN_LEAD, assignedToId: p.id } }));
  const leads = await prisma.lead.findMany({ where: { ...OPEN_LEAD, assignedToId: null }, orderBy: { createdAt: "asc" }, select: { id: true } });
  const given: Record<string, string[]> = {};
  for (const l of leads) {
    const [to] = [...loads.entries()].sort((a, b) => a[1] - b[1]);
    loads.set(to[0], to[1] + 1);
    (given[to[0]] ??= []).push(l.id);
  }
  for (const [userId, ids] of Object.entries(given)) {
    await prisma.lead.updateMany({ where: { id: { in: ids }, assignedToId: null }, data: { assignedToId: userId } });
  }
  return pool.filter((p) => given[p.id]).map((p) => ({ ...p, leadIds: given[p.id] }));
}
