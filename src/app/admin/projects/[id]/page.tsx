import Link from "next/link";
import { notFound } from "next/navigation";
import { FormError } from "@/components/FormError";
import { Notice } from "@/components/admin/Field";
import { LifecyclePanel } from "@/components/admin/LifecyclePanel";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { deleteProjectAction } from "@/lib/actions/lifecycle";
import { getProjectById, projectBlockers } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Edit project" };

const SAVED: Record<string, string> = {
  duplicated: "Copy created: same details and stage names, progress at 0%, not published. Change the name and slug, then publish.",
  archived: "Project archived. It is hidden from the website.",
  restored: "Project restored. It is unpublished: tick Published and save when it is ready to go live.",
};

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> };

export default async function EditProjectPage({ params, searchParams }: Props) {
  const { can } = await requireStaff("projects", "update");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [p, blockers] = await Promise.all([getProjectById(id), projectBlockers(id)]);
  if (!p || !blockers) notFound();

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <Link href={p.archived_at ? "/admin/projects?archived=1" : "/admin/projects"} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-medium text-body hover:border-ink hover:text-ink">
        ← {p.archived_at ? "Archived projects" : "All projects"}
      </Link>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[32px] leading-tight font-semibold tracking-tight lg:text-[44px]">
          Edit project
          {p.archived_at && <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 align-middle text-xs font-medium text-stone-700">Archived</span>}
        </h1>
        <div className="flex gap-4 text-sm">
          {can("progress", "view") && (
            <Link href={`/pm/${p.id}`} className="text-teal-800 hover:underline">
              Progress stages →
            </Link>
          )}
          {p.published && (
            <Link href={`/projects/${p.slug}`} className="text-teal-800 hover:underline" target="_blank">
              View on site ↗
            </Link>
          )}
        </div>
      </div>
      <Notice message={sp.saved ? SAVED[sp.saved] : undefined} />
      <FormError code={sp.error} />
      <ProjectForm project={p} />
      <LifecyclePanel
        kind="project"
        id={p.id}
        name={p.name}
        what="project"
        archivedAt={p.archived_at}
        canArchive={can("projects", "update")}
        canDelete={can("projects", "delete")}
        deleteAction={deleteProjectAction}
        blockers={[
          { label: "units", count: blockers.properties },
          { label: "bookings", count: blockers.bookings },
          { label: "documents", count: blockers.documents },
          { label: "investment opportunities", count: blockers.investments },
        ]}
      />
    </div>
  );
}
