import { PortalShell } from "@/components/PortalShell";
import { StageBars } from "@/components/StageBars";
import { getBookingsForUserDetailed, getProjectStages } from "@/lib/data";
import { requireUser } from "@/lib/require-user";

export default async function PortalProgressPage() {
  const user = await requireUser(["buyer"]);
  const bookings = await getBookingsForUserDetailed(user.id);
  // A buyer with several units in one project should see that project once.
  const projects = [...new Map(bookings.map((b) => [b.project.id, b.project])).values()];
  const stages = await Promise.all(projects.map((p) => getProjectStages(p.id)));

  return (
    <PortalShell title="Project progress">
      {projects.length === 0 && <p className="text-sm text-stone-500">No project updates have been published yet.</p>}
      {projects.map((proj, i) => (
        <div key={proj.id} className="mb-8 rounded-xl border bg-white p-4">
          <div className="flex items-baseline justify-between">
            <p className="font-medium">{proj.name}</p>
            <p className="text-2xl font-bold text-teal-800">{proj.progress_percent}%</p>
          </div>
          <div className="mt-4">
            <StageBars stages={stages[i]} />
          </div>
        </div>
      ))}
    </PortalShell>
  );
}
