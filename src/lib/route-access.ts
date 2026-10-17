/**
 * Which roles/permissions each private URL needs. Checked in src/proxy.ts before any rendering,
 * so a refused request gets a real HTTP redirect. Pages and server actions repeat their own checks
 * (defense in depth); keep both in step when adding a screen.
 */
import type { AppResource, AppRight, UserRole } from "./types";

export type AccessRule =
  | { kind: "buyer" }
  | { kind: "staff" }
  | { kind: "admin" }
  | { kind: "perm"; any: [AppResource, AppRight][] };

const RULES: [RegExp, AccessRule][] = [
  [/^\/portal(\/|$)/, { kind: "buyer" }],
  [/^\/account(\/|$)/, { kind: "staff" }],
  [/^\/sales\/leads\/new\/?$/, { kind: "perm", any: [["leads", "add"]] }],
  [/^\/sales(\/|$)/, { kind: "perm", any: [["leads", "view"]] }],
  [/^\/pm(\/|$)/, { kind: "perm", any: [["progress", "view"]] }],
  [/^\/admin\/?$/, { kind: "admin" }],
  [/^\/admin\/(staff|permissions|content|audit|services)(\/|$)/, { kind: "admin" }],
  [/^\/admin\/customers\/new\/?$/, { kind: "perm", any: [["users", "add"]] }],
  [/^\/admin\/customers(\/|$)/, { kind: "perm", any: [["users", "view"]] }],
  [/^\/admin\/bookings\/new\/?$/, { kind: "perm", any: [["bookings", "add"]] }],
  [/^\/admin\/bookings(\/|$)/, { kind: "perm", any: [["bookings", "view"]] }],
  [/^\/admin\/projects\/new\/?$/, { kind: "perm", any: [["projects", "add"]] }],
  [/^\/admin\/projects\/[^/]+\/?$/, { kind: "perm", any: [["projects", "update"]] }],
  [/^\/admin\/projects\/?$/, { kind: "perm", any: [["projects", "update"], ["projects", "add"]] }],
  [/^\/admin\/properties\/new\/?$/, { kind: "perm", any: [["properties", "add"]] }],
  [/^\/admin\/properties\/[^/]+\/?$/, { kind: "perm", any: [["properties", "update"]] }],
  [/^\/admin\/properties\/?$/, { kind: "perm", any: [["properties", "update"], ["properties", "add"]] }],
  [/^\/admin\/documents(\/|$)/, { kind: "perm", any: [["documents", "add"]] }],
  // Investment opportunities are managed with the Projects permission.
  [/^\/admin\/investments\/new\/?$/, { kind: "perm", any: [["projects", "add"]] }],
  [/^\/admin\/investments\/[^/]+\/?$/, { kind: "perm", any: [["projects", "update"]] }],
  [/^\/admin\/investments\/?$/, { kind: "perm", any: [["projects", "update"], ["projects", "add"]] }],
  // Any other admin URL: staff only; the page itself decides the rest.
  [/^\/admin(\/|$)/, { kind: "staff" }],
];

export function accessRuleFor(pathname: string): AccessRule | undefined {
  return RULES.find(([re]) => re.test(pathname))?.[1];
}

export const STAFF: UserRole[] = ["sales", "project_manager", "admin"];

/** The permission each staff role needs to use its own home desk. */
export const HOME_REQUIREMENT: Partial<Record<UserRole, [AppResource, AppRight]>> = {
  sales: ["leads", "view"],
  project_manager: ["progress", "view"],
};
