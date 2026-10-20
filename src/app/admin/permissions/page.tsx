import Link from "next/link";
import { Notice } from "@/components/admin/Field";
import { PermissionMatrix } from "@/components/admin/PermissionMatrix";
import { ResetPermissionsButton } from "@/components/admin/ResetPermissionsButton";
import { resetPermissionsAction, savePermissionsAction } from "@/lib/actions/permissions";
import { getRolePermissions } from "@/lib/data";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Permissions" };

type Props = { searchParams: Promise<{ saved?: string; reset?: string }> };

export default async function PermissionsPage({ searchParams }: Props) {
  await requireAdmin();
  const [sp, perms] = await Promise.all([searchParams, getRolePermissions()]);
  const initial = perms.filter((p) => p.role !== "admin").map((p) => `${p.role}:${p.resource}:${p.right}`);

  const savedCount = sp.saved === undefined ? undefined : Number(sp.saved);
  const message =
    savedCount === undefined
      ? undefined
      : savedCount === 0
        ? "Nothing changed."
        : `${sp.reset ? "Reset to defaults" : "Saved"}: ${savedCount} change${savedCount === 1 ? "" : "s"}. They apply immediately, without anyone logging out.`;

  return (
    <div className="px-5 py-10 sm:px-[30px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold">Permissions</h1>
          <p className="mt-1 text-sm text-stone-600">
            Choose what each role can do. Every page and action checks these rules on the server, so hiding a button is never the only protection.
          </p>
        </div>
        <ResetPermissionsButton action={resetPermissionsAction} />
      </div>
      <Notice message={message} />

      <details className="mt-4 rounded-lg border bg-white p-4 text-sm text-stone-700">
        <summary className="cursor-pointer font-medium">How these rules work</summary>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            <strong>View</strong> opens a section; <strong>Add</strong> creates records; <strong>Edit</strong> changes them;{" "}
            <strong>Delete</strong> is reserved for upcoming archive features. Add, Edit and Delete always include View.
          </li>
          <li>
            <strong>Visitor</strong> and <strong>Buyer</strong> only have options that apply to them. Buyers only ever see their own bookings,
            payments and documents.
          </li>
          <li>
            <strong>Bookings → Edit</strong> changes schedules; changing a booking&apos;s paid amount also needs <strong>Payments → Edit</strong>.
            Recording a received payment needs <strong>Payments → Add</strong>.
          </li>
          <li>
            <strong>Admin</strong> always has full access and cannot be restricted, so the system can never be locked. Staff accounts, this page,
            website content and the audit log are admin-only. Manage roles on{" "}
            <Link href="/admin/staff" className="text-teal-800 underline">
              Staff
            </Link>
            .
          </li>
          <li>Every save is recorded in the audit log with exactly what was added and removed.</li>
        </ul>
      </details>

      <div className="mt-6">
        {/* Keyed on the saved grants so the matrix resets to server state after a save or reset. */}
        <PermissionMatrix key={[...initial].sort().join("|")} initial={initial} saveAction={savePermissionsAction} />
      </div>
    </div>
  );
}
