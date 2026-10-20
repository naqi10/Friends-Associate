import { getSessionUser } from "@/lib/auth";
import { getStaffBadges } from "@/lib/data";
import { homeForRole, isStaff, permissionsFor } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/permission-catalog";
import { EXTRA_CRUMBS, menuFor } from "./nav";
import { ShellFrame } from "./ShellFrame";

/**
 * Staff layout (sidebar, top bar, phone menus) around every admin, sales, PM and account page.
 * It only decides what to show; each page still checks permissions itself.
 */
export async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) return <>{children}</>;
  const can = await permissionsFor(user);
  const menu = menuFor(can, user);
  const badges = await getStaffBadges();

  return (
    <ShellFrame
      menu={menu}
      crumbs={EXTRA_CRUMBS}
      badges={{ leads: can("leads", "view") ? badges.newLeads : 0, overdue: can("bookings", "view") ? badges.overdue : 0 }}
      user={{ name: user.name, role: ROLE_LABELS[user.role] }}
      home={homeForRole(user.role)}
      canBook={can("bookings", "add")}
      canSeeBookings={can("bookings", "view")}
      canSearch={can("users", "view") || can("leads", "view") || can("bookings", "view") || can("properties", "update") || can("projects", "update")}
    >
      {children}
    </ShellFrame>
  );
}
