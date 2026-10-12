import { prisma } from "../db";
import { EDITABLE_ROLES, type Grant } from "../permission-catalog";

const key = (g: Grant) => `${g.role}:${g.resource}:${g.right}`;

/**
 * Replaces all grants for the editable roles in one transaction and returns exactly what changed.
 * Admin rows are never touched: admins bypass the matrix so they cannot be locked out.
 */
export async function replaceEditableGrants(next: Grant[]) {
  const roles = EDITABLE_ROLES.map((r) => r.key as string);
  return prisma.$transaction(async (tx) => {
    const current = (await tx.rolePermission.findMany({ where: { role: { in: roles } } })) as Grant[];
    const before = new Set(current.map(key));
    const after = new Set(next.map(key));
    const added = [...after].filter((k) => !before.has(k));
    const removed = [...before].filter((k) => !after.has(k));
    if (added.length || removed.length) {
      await tx.rolePermission.deleteMany({ where: { role: { in: roles } } });
      if (next.length) await tx.rolePermission.createMany({ data: next });
    }
    return { added, removed };
  });
}
