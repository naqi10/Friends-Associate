import { prisma } from "../db";

export type AuditEntry = {
  userId: string;
  action: string;
  module: string;
  recordId?: string;
  oldValue?: unknown;
  newValue?: unknown;
};

const SECRET_KEYS = /pass|token|hash|secret/i;

/** Strips anything that looks like a credential before it is written to the log. */
function serialize(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value, (k, v) => (k && SECRET_KEYS.test(k) ? undefined : v));
}

export async function writeAuditLog(entry: AuditEntry) {
  await prisma.auditLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      module: entry.module,
      recordId: entry.recordId ?? null,
      oldValue: serialize(entry.oldValue),
      newValue: serialize(entry.newValue),
    },
  });
}

export async function getRecentAuditLogs(take = 50) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { name: true, email: true } } },
  });
}

/** Areas that mean the same thing in the log (customers used to be logged as "users"). */
const AREA_MODULES: Record<string, string[]> = { customers: ["customers", "users"] };

/** Audit log page: newest first, optionally one person and/or one area, older pages via `before`. */
export async function getAuditFeed({ who, area, before, take = 100 }: { who?: string; area?: string; before?: Date; take?: number }) {
  return prisma.auditLog.findMany({
    where: {
      ...(who ? { userId: who } : {}),
      ...(area ? { module: { in: AREA_MODULES[area] ?? [area] } } : {}),
      ...(before ? { createdAt: { lt: before } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { id: true, name: true, role: true } } },
  });
}

/** Start of today in Pakistan time (UTC+5, no daylight saving). */
export function startOfTodayPk(now = new Date()) {
  const pk = new Date(now.getTime() + 5 * 3600_000);
  return new Date(Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate()) - 5 * 3600_000);
}

/** The four figures at the top of the Audit log, for today. */
export async function getAuditTodayStats() {
  const where = { createdAt: { gte: startOfTodayPk() } };
  const [changes, people, deletions, payments] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ["userId"], where: { ...where, userId: { not: null } } }),
    prisma.auditLog.count({ where: { ...where, OR: [{ action: { contains: "delete" } }, { action: "bulk-archive" }, { action: "archive" }] } }),
    prisma.auditLog.count({ where: { ...where, action: "record-payment" } }),
  ]);
  return { changes, people: people.length, deletions, payments };
}

/** People and areas that appear in the log, for the filter pills. */
export async function getAuditFilters() {
  const [people, areas] = await Promise.all([
    prisma.auditLog.groupBy({ by: ["userId"], where: { userId: { not: null } }, _max: { createdAt: true }, orderBy: { _max: { createdAt: "desc" } }, take: 8 }),
    prisma.auditLog.groupBy({ by: ["module"] }),
  ]);
  const users = await prisma.user.findMany({ where: { id: { in: people.map((p) => p.userId!) } }, select: { id: true, name: true } });
  return {
    people: people.map((p) => users.find((u) => u.id === p.userId)).filter((u): u is { id: string; name: string } => !!u),
    areas: [...new Set(areas.map((a) => (a.module === "users" ? "customers" : a.module)))],
  };
}
