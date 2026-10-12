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
