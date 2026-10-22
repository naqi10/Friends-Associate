import { PermissionMatrix } from "@/components/admin/PermissionMatrix";
import { ResetPermissionsButton } from "@/components/admin/ResetPermissionsButton";
import { resetPermissionsAction, savePermissionsAction } from "@/lib/actions/permissions";
import { prisma } from "@/lib/db";
import { getRolePermissions } from "@/lib/data";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Permissions" };

type Props = { searchParams: Promise<{ saved?: string; reset?: string; role?: string }> };

export default async function PermissionsPage({ searchParams }: Props) {
  await requireAdmin();
  const [sp, perms, people] = await Promise.all([
    searchParams,
    getRolePermissions(),
    prisma.user.groupBy({ by: ["role"], where: { active: true, deletedAt: null }, _count: { _all: true } }),
  ]);
  const initial = perms.filter((p) => p.role !== "admin").map((p) => `${p.role}:${p.resource}:${p.right}`);
  const counts = Object.fromEntries(people.map((g) => [g.role, g._count._all]));

  const savedCount = sp.saved === undefined ? undefined : Number(sp.saved);
  const message =
    savedCount === undefined
      ? undefined
      : savedCount === 0
        ? "Nothing changed."
        : `${sp.reset ? "Reset to defaults" : "Saved"}: ${savedCount} change${savedCount === 1 ? "" : "s"}. They apply right away, without anyone logging out.`;

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:pt-10 lg:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 max-w-4xl">
          <h1 className="text-[30px] font-semibold tracking-tight lg:text-[44px]">Permissions</h1>
          <p className="mt-1 flex gap-2 text-[15px] text-muted">
            <svg viewBox="0 0 24 24" aria-hidden className="mt-0.5 hidden h-5 w-5 shrink-0 text-teal-800 lg:block" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" />
            </svg>
            <span className="lg:hidden">Pick a role, then tap to allow or block.</span>
            <span className="hidden lg:inline">
              Pick a role, then choose what it can do in each area. Every rule is checked on the server, so hiding a button is never the only protection.
            </span>
          </p>
        </div>
        <div className="hidden shrink-0 lg:block">
          <ResetPermissionsButton action={resetPermissionsAction} />
        </div>
      </div>
      {message && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</p>}

      {/* Keyed on the saved grants so the editor resets to server state after a save or reset. */}
      <PermissionMatrix key={[...initial].sort().join("|")} initial={initial} saveAction={savePermissionsAction} counts={counts} initialRole={sp.role} />

      <div className="mt-6 lg:hidden">
        <ResetPermissionsButton action={resetPermissionsAction} />
      </div>
    </div>
  );
}
