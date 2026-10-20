import Link from "next/link";
import { notFound } from "next/navigation";
import { FormError } from "@/components/FormError";
import { Notice } from "@/components/admin/Field";
import { InvestmentForm } from "@/components/admin/InvestmentForm";
import { LifecyclePanel } from "@/components/admin/LifecyclePanel";
import { deleteInvestmentAction } from "@/lib/actions/lifecycle";
import { getInvestmentById, getProjectById, getProjects, investmentLeadCount } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Edit investment opportunity" };

const SAVED: Record<string, string> = {
  archived: "Opportunity archived. It is hidden from the website.",
  restored: "Opportunity restored. It is unpublished: tick Published and save when it is ready to go live.",
};

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> };

export default async function EditInvestmentPage({ params, searchParams }: Props) {
  const { can } = await requireStaff("projects", "update");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [inv, active, leads] = await Promise.all([getInvestmentById(id), getProjects(), investmentLeadCount(id)]);
  if (!inv) notFound();
  // Keep the linked project selectable even if it is archived, so saving never unlinks it.
  const own = inv.projectId && !active.some((p) => p.id === inv.projectId) ? await getProjectById(inv.projectId) : null;
  const projects = own ? [...active, { ...own, name: `${own.name} (archived)` }] : active;

  return (
    <div className="px-5 py-10 sm:px-[30px]">
      <Link href={inv.archivedAt ? "/admin/investments?archived=1" : "/admin/investments"} className="text-sm text-stone-600 hover:underline">
        ← {inv.archivedAt ? "Archived opportunities" : "All opportunities"}
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          Edit investment opportunity
          {inv.archivedAt && <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 align-middle text-xs font-medium text-stone-700">Archived</span>}
        </h1>
        {inv.published && (
          <Link href={`/investment/${inv.slug}`} target="_blank" className="text-sm text-teal-800 hover:underline">
            View on site ↗
          </Link>
        )}
      </div>
      <Notice message={sp.saved ? SAVED[sp.saved] : undefined} />
      <FormError code={sp.error} />
      <InvestmentForm inv={inv} projects={projects} />
      <LifecyclePanel
        kind="investment"
        id={inv.id}
        name={inv.title}
        what="opportunity"
        archivedAt={inv.archivedAt}
        canArchive={can("projects", "update")}
        canDelete={can("projects", "delete")}
        deleteAction={deleteInvestmentAction}
        blockers={[{ label: "interested investors (leads)", count: leads }]}
      />
    </div>
  );
}
