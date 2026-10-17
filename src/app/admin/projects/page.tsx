import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { ArchiveTabs } from "@/components/admin/ArchiveTabs";
import { DIVISIONS, PROJECT_CATEGORIES, labelOf } from "@/lib/catalog";
import { getProjects } from "@/lib/data";
import { requireStaffAny } from "@/lib/permissions";

type Props = { searchParams: Promise<{ saved?: string; archived?: string }> };

export default async function AdminProjectsPage({ searchParams }: Props) {
  const { can } = await requireStaffAny([
    ["projects", "update"],
    ["projects", "add"],
  ]);
  const sp = await searchParams;
  const archived = sp.archived === "1";
  const [projects, archivedList] = await Promise.all([getProjects({ archived }), getProjects({ archived: true })]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <AdminNav active="/admin/projects" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        {can("projects", "add") && (
          <Link href="/admin/projects/new" className="rounded-md bg-teal-800 px-3 py-2 text-sm text-white">
            Add project
          </Link>
        )}
      </div>
      {sp.saved === "1" && <p className="mt-3 text-sm text-teal-800">Saved.</p>}
      {sp.saved === "deleted" && <p className="mt-3 text-sm text-teal-800">Project deleted.</p>}
      <ArchiveTabs base="/admin/projects" archived={archived} archivedCount={archivedList.length} />
      {projects.length === 0 && (
        <p className="mt-6 text-sm text-stone-500">{archived ? "No archived projects." : "No projects yet."}</p>
      )}
      <ul className="mt-6 space-y-2">
        {projects.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded border bg-white p-3 text-sm">
            <span>
              {p.name} <span className="text-stone-500">({p.slug})</span>
              <span className="ml-2 text-xs text-stone-500">
                {labelOf(DIVISIONS, p.division)} · {labelOf(PROJECT_CATEGORIES, p.category)} · {p.progress_percent}%
              </span>
              {!p.published && <span className="ml-2 rounded bg-stone-200 px-1.5 text-xs">Hidden</span>}
              {p.featured && <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-900">Featured</span>}
            </span>
            {can("projects", "update") && (
              <Link href={`/admin/projects/${p.id}`} className="text-teal-800 hover:underline">
                Edit
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
