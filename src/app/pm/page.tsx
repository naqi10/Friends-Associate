import Link from "next/link";
import type { Metadata } from "next";
import { AdminNav, DeniedNotice } from "@/components/AdminNav";
import { StageBars } from "@/components/StageBars";
import { logoutAction } from "@/lib/actions/auth";
import { updateProgressAction } from "@/lib/actions/pm";
import { PROJECT_CATEGORIES, labelOf } from "@/lib/catalog";
import { getProjectsFiltered } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

export const metadata: Metadata = { title: "Project manager desk", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ denied?: string }> };

export default async function PmDeskPage({ searchParams }: Props) {
  const { can } = await requireStaff("progress", "view");
  const [{ denied }, projects] = await Promise.all([searchParams, getProjectsFiltered()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Project manager desk</h1>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-stone-600">
            Logout
          </button>
        </form>
      </div>
      <div className="mt-6">
        <AdminNav active="/pm" />
        <DeniedNotice denied={denied} />
      </div>
      <ul className="grid gap-6 md:grid-cols-2">
        {projects.map((p) => (
          <li key={p.id} className="flex flex-col rounded-xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-stone-500">
                  {labelOf(PROJECT_CATEGORIES, p.category)} · {p.city}
                  {!p.published && " · Unpublished"}
                </p>
              </div>
              <span className="text-xl font-bold text-teal-800">{p.progress_percent}%</span>
            </div>
            <div className="mt-4 flex-1">
              <StageBars stages={p.stages} compact />
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t pt-4">
              {can("progress", "update") ? (
                <form action={updateProgressAction} className="flex items-end gap-2 text-sm">
                  <input type="hidden" name="projectId" value={p.id} />
                  <label className="text-xs">
                    Status
                    <input name="status" defaultValue={p.status} maxLength={80} className="mt-1 block w-44 rounded border px-2 py-1 text-sm" />
                  </label>
                  <button type="submit" className="rounded bg-teal-800 px-3 py-1 text-white">
                    Update
                  </button>
                </form>
              ) : (
                <span className="text-sm text-stone-600">{p.status}</span>
              )}
              <Link href={`/pm/${p.id}`} className="text-sm font-medium text-teal-800 hover:underline">
                {can("progress", "add") || can("progress", "update") ? "Manage stages →" : "View stages →"}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
