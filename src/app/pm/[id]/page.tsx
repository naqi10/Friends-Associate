import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormError } from "@/components/FormError";
import { Notice } from "@/components/admin/Field";
import { StageBars } from "@/components/StageBars";
import { addStageAction, deleteStageAction, updateStageAction } from "@/lib/actions/pm";
import { STAGE_SUGGESTIONS, labelOf, PROJECT_CATEGORIES } from "@/lib/catalog";
import { getProjectById, getProjectStages } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

export const metadata: Metadata = { title: "Progress stages", robots: { index: false, follow: false } };

const SAVED: Record<string, string> = {
  added: "Stage added. Overall progress was recalculated.",
  updated: "Stage saved. Overall progress was recalculated.",
  deleted: "Stage removed. Overall progress was recalculated.",
};

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function ProjectStagesPage({ params, searchParams }: Props) {
  const { can } = await requireStaff("progress", "view");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [project, stages] = await Promise.all([getProjectById(id), getProjectStages(id)]);
  if (!project) notFound();
  const input = "rounded-md border border-stone-300 px-2 py-1.5 text-sm";

  return (
    <div className="px-5 py-10 sm:px-[30px]">
      <Link href="/pm" className="text-sm text-stone-600 hover:underline">
        ← All projects
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{project.name}</h1>
      <p className="text-sm text-stone-600">
        {labelOf(PROJECT_CATEGORIES, project.category)} · {project.status} · Overall {project.progress_percent}%
      </p>
      <Notice message={sp.saved ? SAVED[sp.saved] : undefined} />
      <FormError code={sp.error} />

      <section className="mt-6 admin-card p-6">
        <h2 className="font-semibold">As shown on the website</h2>
        <div className="mt-4">
          <StageBars stages={stages} />
        </div>
      </section>

      {(can("progress", "update") || can("progress", "delete")) && stages.length > 0 && (
        <section className="mt-6 admin-card p-6">
          <h2 className="font-semibold">Edit stages</h2>
          <ul className="mt-4 divide-y">
            {stages.map((s) => (
              <li key={s.id} className="flex flex-wrap items-end gap-2 py-3">
                {can("progress", "update") ? (
                  <form action={updateStageAction} className="flex flex-1 flex-wrap items-end gap-2">
                    <input type="hidden" name="stageId" value={s.id} />
                    <label className="text-xs">
                      Stage
                      <input name="name" defaultValue={s.name} required maxLength={80} className={`mt-1 block w-48 ${input}`} />
                    </label>
                    <label className="text-xs">
                      %
                      <input name="percent" type="number" min={0} max={100} step={1} defaultValue={s.percent} required className={`mt-1 block w-20 ${input}`} />
                    </label>
                    <label className="text-xs">
                      Until (optional)
                      <input name="target_date" type="date" defaultValue={s.target_date ?? ""} className={`mt-1 block ${input}`} />
                    </label>
                    <label className="text-xs">
                      Note
                      <input name="note" defaultValue={s.note} maxLength={200} className={`mt-1 block w-48 ${input}`} />
                    </label>
                    <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-body">
                      Save
                    </button>
                  </form>
                ) : (
                  <span className="flex-1 text-sm">{s.name}</span>
                )}
                {can("progress", "delete") && (
                  <form action={deleteStageAction}>
                    <input type="hidden" name="stageId" value={s.id} />
                    <button type="submit" className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">
                      Remove
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {can("progress", "add") && (
        <section id="add" className="mt-6 scroll-mt-24 admin-card p-6">
          <h2 className="font-semibold">Add a stage</h2>
          <form action={addStageAction} className="mt-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="projectId" value={project.id} />
            <label className="text-xs">
              Stage
              <input name="name" list="stage-suggestions" required maxLength={80} placeholder="Grey structure" className={`mt-1 block w-56 ${input}`} />
              <datalist id="stage-suggestions">
                {STAGE_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <label className="text-xs">
              %
              <input name="percent" type="number" min={0} max={100} step={1} required defaultValue={0} className={`mt-1 block w-20 ${input}`} />
            </label>
            <label className="text-xs">
              Until (optional)
              <input name="target_date" type="date" className={`mt-1 block ${input}`} />
            </label>
            <label className="text-xs">
              Note
              <input name="note" maxLength={200} className={`mt-1 block w-48 ${input}`} />
            </label>
            <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-body">
              Add stage
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
