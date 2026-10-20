import Link from "next/link";
import { FormError } from "@/components/FormError";
import { StaffTable } from "@/components/admin/StaffTable";
import { getStaffRows } from "@/lib/data";
import { ROLE_LABELS, STAFF_ROLES } from "@/lib/permission-catalog";
import { requireAdmin } from "@/lib/permissions";
import { isRoleEnabled } from "@/lib/release";

export const metadata = { title: "Staff" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function StaffPage({ searchParams }: Props) {
  await requireAdmin();
  const [{ error }, rows] = await Promise.all([searchParams, getStaffRows()]);
  const active = rows.filter((r) => r.active);

  return (
    <div className="px-5 py-10 sm:px-[30px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-sm text-stone-600">
            Team logins and roles. What each role can do is set on{" "}
            <Link href="/admin/permissions" className="text-teal-800 underline">
              Permissions
            </Link>
            .
          </p>
        </div>
        <Link href="/admin/staff/new" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
          Add staff member
        </Link>
      </div>
      <FormError code={error} />
      {(!isRoleEnabled("sales") || !isRoleEnabled("project_manager")) && (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Not live yet on this site:{" "}
          {[!isRoleEnabled("sales") && "Sales", !isRoleEnabled("project_manager") && "Project manager"].filter(Boolean).join(" and ")} logins.
          You can create these accounts now; they can sign in once the release setting is changed.
        </p>
      )}

      <dl className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="admin-card p-4">
          <dt className="text-sm text-stone-600">Active accounts</dt>
          <dd className="mt-1 text-2xl font-semibold">{active.length}</dd>
        </div>
        {STAFF_ROLES.map((role) => (
          <div key={role} className="admin-card p-4">
            <dt className="text-sm text-stone-600">{ROLE_LABELS[role]}</dt>
            <dd className="mt-1 text-2xl font-semibold">{active.filter((r) => r.role === role).length}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6">
        <StaffTable rows={rows} />
      </div>
    </div>
  );
}
