import { prisma } from "../db";

export async function countRecentFailures(key: string, since: Date) {
  return prisma.loginAttempt.count({ where: { key, success: false, createdAt: { gte: since } } });
}

export async function recordLoginAttempt(keys: string[], success: boolean) {
  await prisma.loginAttempt.createMany({ data: keys.map((key) => ({ key, success })) });
}

/** Keeps the table small; attempts older than a day are no longer relevant to rate limits. */
export async function pruneLoginAttempts() {
  await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } });
}
