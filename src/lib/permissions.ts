import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getRolePermissions } from "@/lib/data";
import { isApplicable, STAFF_ROLES, type StaffRole } from "./permission-catalog";
import { HOME_REQUIREMENT } from "./route-access";
import type { AppResource, AppRight, PermissionRole, User, UserRole } from "./types";

export type Can = (resource: AppResource, right: AppRight) => boolean;

/**
 * Builds a synchronous checker for one role from the (per-request cached) role_permissions table.
 * Admin always passes so the matrix can never lock administrators out.
 */
export async function permissionsFor(user: Pick<User, "role"> | null): Promise<Can> {
  const role: PermissionRole = user?.role ?? "visitor";
  if (role === "admin") return () => true;
  const granted = new Set(
    (await getRolePermissions()).filter((p) => p.role === role).map((p) => `${p.resource}:${p.right}`),
  );
  return (resource, right) => isApplicable(role, resource, right) && granted.has(`${resource}:${right}`);
}

export async function hasRight(
  role: PermissionRole | UserRole,
  resource: AppResource,
  right: AppRight,
): Promise<boolean> {
  const can = await permissionsFor(role === "visitor" ? null : { role });
  return can(resource, right);
}

export function isStaff(role: UserRole): role is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

/**
 * Server-side gate for staff tools: must be logged in, must be staff, and (optionally) hold the right.
 * Buyers are always refused here even if they hold a public "view" grant.
 */
export async function requireStaff(resource?: AppResource, right: AppRight = "view") {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isStaff(user.role)) redirect(homeForRole(user.role));
  const can = await permissionsFor(user);
  if (resource && !can(resource, right)) redirect(deniedUrl(user.role, can));
  return { user, can };
}

/** Where to send a refused staff member: their desk, or My account if the desk itself is closed to them. */
export function deniedUrl(role: UserRole, can: Can) {
  const home = HOME_REQUIREMENT[role];
  return home && !can(...home) ? "/account?denied=1" : `${homeForRole(role)}?denied=1`;
}

/** For a page needing any one of several rights (e.g. a list that is useful with view or add). */
export async function requireStaffAny(checks: [AppResource, AppRight][]) {
  const { user, can } = await requireStaff();
  if (!checks.some(([res, right]) => can(res, right))) redirect(deniedUrl(user.role, can));
  return { user, can };
}

/** Non-delegable admin tools: staff accounts, permissions, website content, audit log. */
export async function requireAdmin() {
  const { user, can } = await requireStaff();
  if (user.role !== "admin") redirect(deniedUrl(user.role, can));
  return { user, can };
}

export function homeForRole(role: UserRole): string {
  switch (role) {
    case "buyer":
      return "/portal";
    case "sales":
      return "/sales";
    case "project_manager":
      return "/pm";
    case "admin":
      return "/admin";
    default:
      return "/";
  }
}
