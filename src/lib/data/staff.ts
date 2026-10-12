import { prisma } from "../db";
import type { StaffRole } from "../permission-catalog";

/** Safe fields for staff screens. Never includes the password hash. */
const staffSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  city: true,
  role: true,
  active: true,
  lastLoginAt: true,
} as const;

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  role: StaffRole;
  active: boolean;
  lastLoginAt: string | null;
};

export async function getStaffRows(): Promise<StaffRow[]> {
  const rows = await prisma.user.findMany({
    where: { role: { not: "buyer" } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: staffSelect,
  });
  return rows.map((u) => ({ ...u, role: u.role as StaffRole, lastLoginAt: u.lastLoginAt?.toISOString() ?? null }));
}

export async function getStaffMember(id: string) {
  const row = await prisma.user.findFirst({ where: { id, role: { not: "buyer" } }, select: staffSelect });
  return row ? { ...row, role: row.role as StaffRole } : null;
}

export async function createStaff(data: {
  name: string;
  email: string;
  phone: string;
  city: string;
  role: StaffRole;
  passwordHash: string;
}) {
  return prisma.user.create({ data: { ...data, cnic: "" }, select: { id: true } });
}

export class StaffRuleError extends Error {
  constructor(public code: "last-admin" | "missing") {
    super(code);
  }
}

/**
 * Updates a staff account. Runs in a transaction so two admins demoting each other at the same time
 * cannot leave the system with no active administrator.
 */
export async function updateStaff(
  id: string,
  data: Partial<{ name: string; email: string; phone: string; city: string; role: StaffRole; active: boolean; passwordHash: string }>,
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.user.findFirst({ where: { id, role: { not: "buyer" } }, select: staffSelect });
    if (!before) throw new StaffRuleError("missing");
    const losesAdmin =
      before.role === "admin" && before.active && ((data.role && data.role !== "admin") || data.active === false);
    if (losesAdmin) {
      const otherAdmins = await tx.user.count({ where: { role: "admin", active: true, NOT: { id } } });
      if (otherAdmins === 0) throw new StaffRuleError("last-admin");
    }
    const after = await tx.user.update({ where: { id }, data, select: staffSelect });
    return { before, after };
  });
}

export async function recordLogin(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

/** Any role. Used by "change my password" after the current password has been verified. */
export async function setPasswordHash(userId: string, passwordHash: string) {
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
