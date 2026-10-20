import type { Can } from "@/lib/permissions";
import type { User } from "@/lib/types";

export type NavItem = { href: string; label: string; icon: string; badge?: "leads" | "overdue" };
export type NavGroup = { label: string; items: NavItem[] };

type Rule = (can: Can, user: User) => boolean;
const admin: Rule = (_, u) => u.role === "admin";
const projectsAdmin: Rule = (can) => can("projects", "update") || can("projects", "add");

/** The staff menu. Each rule mirrors the server-side check on that page, so a hidden link is also a refused page. */
const MENU: { label: string; items: (NavItem & { show: Rule })[] }[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: "home", show: admin }] },
  {
    label: "Sales",
    items: [
      { href: "/sales", label: "Sales desk", icon: "sales", badge: "leads", show: (can) => can("leads", "view") },
      { href: "/admin/customers", label: "Customers", icon: "users", show: (can) => can("users", "view") },
      { href: "/admin/bookings", label: "Bookings & payments", icon: "card", badge: "overdue", show: (can) => can("bookings", "view") },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/pm", label: "PM desk", icon: "helmet", show: (can) => can("progress", "view") },
      { href: "/admin/projects", label: "Projects", icon: "folder", show: projectsAdmin },
      { href: "/admin/properties", label: "Properties", icon: "building", show: (can) => can("properties", "update") || can("properties", "add") },
      { href: "/admin/investments", label: "Investments", icon: "dollar", show: projectsAdmin },
      { href: "/admin/documents", label: "Documents", icon: "file", show: (can) => can("documents", "add") },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/staff", label: "Staff", icon: "user", show: admin },
      { href: "/admin/permissions", label: "Permissions", icon: "lock", show: admin },
      { href: "/admin/content", label: "Website content", icon: "globe", show: admin },
      { href: "/admin/audit", label: "Audit log", icon: "history", show: admin },
    ],
  },
];

/** Pages that are not in the menu but need a breadcrumb label. */
export const EXTRA_CRUMBS: NavItem[] = [
  { href: "/admin/services", label: "Website content", icon: "globe" },
  { href: "/admin/reminders", label: "Payment reminders", icon: "bell" },
  { href: "/admin/search", label: "Search", icon: "search" },
  { href: "/account", label: "My account", icon: "settings" },
];

export function menuFor(can: Can, user: User): NavGroup[] {
  return MENU.map((g) => ({
    label: g.label,
    items: g.items.filter((i) => i.show(can, user)).map(({ href, label, icon, badge }) => ({ href, label, icon, badge })),
  })).filter((g) => g.items.length > 0);
}
