/**
 * Single source of truth for the role/permission matrix: what can be granted, to whom, and the defaults.
 * Used by the seed, the permissions screen, and server-side enforcement.
 */
import type { AppResource, AppRight, PermissionRole } from "./types";

export const RESOURCES: { key: AppResource; label: string; description: string }[] = [
  { key: "projects", label: "Projects", description: "Project pages and Admin → Projects" },
  { key: "properties", label: "Properties", description: "Unit inventory and Admin → Properties" },
  { key: "bookings", label: "Bookings", description: "Buyer bookings and payment schedules" },
  { key: "payments", label: "Payments", description: "Recording received payments and paid amounts" },
  { key: "documents", label: "Documents", description: "Public and buyer documents, uploads" },
  { key: "progress", label: "Progress", description: "Construction progress and the PM desk" },
  { key: "users", label: "Customers", description: "Buyer accounts in Admin → Customers" },
  { key: "leads", label: "Leads & inquiries", description: "The sales desk" },
  { key: "chatbot", label: "Help chat", description: "The help assistant" },
  { key: "reports", label: "Reports", description: "Reserved for upcoming reports" },
];

export const RIGHTS: { key: AppRight; label: string }[] = [
  { key: "view", label: "View" },
  { key: "add", label: "Add" },
  { key: "update", label: "Edit" },
  { key: "delete", label: "Delete" },
];

/** Roles whose grants the admin can edit. Admin always has full access and is not editable (prevents lock-out). */
export const EDITABLE_ROLES: { key: Exclude<PermissionRole, "admin">; label: string; description: string }[] = [
  { key: "visitor", label: "Visitor", description: "Anyone not logged in" },
  { key: "buyer", label: "Buyer", description: "Logged-in customers (own data only)" },
  { key: "sales", label: "Sales", description: "Sales team" },
  { key: "project_manager", label: "Project manager", description: "Site and project managers" },
];

export const STAFF_ROLES = ["sales", "project_manager", "admin"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Admin",
  sales: "Sales",
  project_manager: "Project manager",
};

export const ROLE_SUMMARIES: Record<StaffRole, string> = {
  admin: "Full access to everything, including staff accounts, permissions and website content.",
  sales: "Sales desk, leads and bookings, as configured on the Permissions page.",
  project_manager: "Progress updates, project details and documents, as configured on the Permissions page.",
};

const PUBLIC_VIEW: AppResource[] = ["projects", "properties", "documents", "progress", "chatbot"];

/**
 * Which cells are meaningful per role. Visitors and buyers never reach staff tools,
 * so granting them e.g. "Customers → Edit" would be misleading; those cells are not offered.
 */
export function isApplicable(role: PermissionRole, resource: AppResource, right: AppRight): boolean {
  if (role === "admin" || role === "sales" || role === "project_manager") return true;
  if (role === "visitor") return right === "view" && PUBLIC_VIEW.includes(resource);
  // Buyer: public views plus their own bookings and payments, and asking the chat about them.
  if (right === "view") return [...PUBLIC_VIEW, "bookings", "payments"].includes(resource);
  return resource === "chatbot" && right === "add";
}

export type Grant = { role: PermissionRole; resource: AppResource; right: AppRight };

export const DEFAULT_GRANTS: Grant[] = (() => {
  const grants: Grant[] = [];
  const add = (role: PermissionRole, resource: AppResource, ...rights: AppRight[]) =>
    rights.forEach((right) => grants.push({ role, resource, right }));

  for (const r of PUBLIC_VIEW) {
    add("visitor", r, "view");
    add("buyer", r, "view");
  }
  add("buyer", "payments", "view");
  add("buyer", "bookings", "view");
  add("buyer", "chatbot", "add");

  add("sales", "projects", "view");
  add("sales", "documents", "view");
  add("sales", "payments", "view");
  add("sales", "users", "view");
  add("sales", "progress", "view");
  add("sales", "chatbot", "view");
  add("sales", "properties", "view", "update");
  add("sales", "leads", "view", "add", "update");
  add("sales", "bookings", "view", "add", "update");
  add("sales", "reports", "view");

  add("project_manager", "projects", "view", "update");
  add("project_manager", "documents", "view", "add", "update");
  add("project_manager", "progress", "view", "add", "update");
  add("project_manager", "properties", "view");
  add("project_manager", "bookings", "view");
  add("project_manager", "chatbot", "view");
  add("project_manager", "reports", "view");

  for (const { key } of RESOURCES) add("admin", key, "view", "add", "update", "delete");
  return grants;
})();
