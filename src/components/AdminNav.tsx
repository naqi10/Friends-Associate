import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { permissionsFor, type Can } from "@/lib/permissions";
import type { User } from "@/lib/types";

type NavLink = { href: string; label: string; show: (can: Can, user: User) => boolean };

const isAdmin = (_: Can, u: User) => u.role === "admin";

/** Every staff section and who may see it. Links mirror the server-side checks on each page. */
const LINKS: NavLink[] = [
  { href: "/admin", label: "Dashboard", show: isAdmin },
  { href: "/sales", label: "Sales desk", show: (can) => can("leads", "view") },
  { href: "/pm", label: "PM desk", show: (can) => can("progress", "view") },
  { href: "/admin/customers", label: "Customers", show: (can) => can("users", "view") },
  { href: "/admin/bookings", label: "Bookings & payments", show: (can) => can("bookings", "view") },
  { href: "/admin/projects", label: "Projects", show: (can) => can("projects", "update") || can("projects", "add") },
  { href: "/admin/properties", label: "Properties", show: (can) => can("properties", "update") || can("properties", "add") },
  { href: "/admin/investments", label: "Investments", show: (can) => can("projects", "update") || can("projects", "add") },
  { href: "/admin/documents", label: "Documents", show: (can) => can("documents", "add") },
  { href: "/admin/staff", label: "Staff", show: isAdmin },
  { href: "/admin/permissions", label: "Permissions", show: isAdmin },
  { href: "/admin/content", label: "Website content", show: isAdmin },
  { href: "/admin/audit", label: "Audit log", show: isAdmin },
  { href: "/account", label: "My account", show: () => true },
];

export async function AdminNav({ active }: { active?: string }) {
  const user = await getSessionUser();
  if (!user || user.role === "buyer") return null;
  const can = await permissionsFor(user);
  const links = LINKS.filter((l) => l.show(can, user));

  return (
    <nav aria-label="Staff" className="mb-8 flex flex-wrap gap-x-4 gap-y-2 border-b border-stone-200 pb-3 text-sm font-medium">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={active === l.href ? "page" : undefined}
          className={active === l.href ? "text-teal-800 underline underline-offset-4" : "text-stone-600 hover:text-teal-800"}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export function DeniedNotice({ denied }: { denied?: string }) {
  if (denied !== "1") return null;
  return (
    <p role="alert" className="mb-6 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
      You do not have permission to access that page. Ask an administrator if you need it.
    </p>
  );
}
