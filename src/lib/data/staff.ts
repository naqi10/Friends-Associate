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
    where: { role: { not: "buyer" }, deletedAt: null },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: staffSelect,
  });
  return rows.map((u) => ({ ...u, email: u.email ?? "", role: u.role as StaffRole, lastLoginAt: u.lastLoginAt?.toISOString() ?? null }));
}

export async function getStaffMember(id: string) {
  const row = await prisma.user.findFirst({ where: { id, role: { not: "buyer" }, deletedAt: null }, select: staffSelect });
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
  constructor(public code: "last-admin" | "missing" | "self") {
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
    const before = await tx.user.findFirst({ where: { id, role: { not: "buyer" }, deletedAt: null }, select: staffSelect });
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

/**
 * Deletes a staff account. Their name stays on everything they did (audit log, payments, lead history), but the
 * login is gone for good: signed out everywhere, password unusable, and the email freed so it can be reused.
 * Open leads assigned to them become unassigned so nothing is lost on the Sales desk.
 */
export async function deleteStaff(id: string, actorId: string) {
  if (id === actorId) throw new StaffRuleError("self");
  return prisma.$transaction(async (tx) => {
    const before = await tx.user.findFirst({ where: { id, role: { not: "buyer" }, deletedAt: null }, select: staffSelect });
    if (!before) throw new StaffRuleError("missing");
    if (before.role === "admin" && before.active) {
      const otherAdmins = await tx.user.count({ where: { role: "admin", active: true, deletedAt: null, NOT: { id } } });
      if (otherAdmins === 0) throw new StaffRuleError("last-admin");
    }
    const unassigned = await tx.lead.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } });
    await tx.session.deleteMany({ where: { userId: id } });
    await tx.notification.deleteMany({ where: { userId: id } });
    await tx.user.update({
      where: { id },
      data: {
        active: false,
        deletedAt: new Date(),
        email: `deleted-${id}@deleted.invalid`,
        // Not a bcrypt hash, so no password can ever match it.
        passwordHash: "!deleted",
        phone: "",
      },
    });
    return { before, unassignedLeads: unassigned.count };
  });
}
