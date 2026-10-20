import Image from "next/image";
import { PortalShell } from "@/components/PortalShell";
import { StageBars } from "@/components/StageBars";
import { getBookingsForUserDetailed, getProjectStages, getPublishedUpdates } from "@/lib/data";
import { focalPosition, hasRealImage } from "@/lib/media";
import { requireUser } from "@/lib/require-user";

export default async function PortalProgressPage() {
  const user = await requireUser(["buyer"]);
  const bookings = (await getBookingsForUserDetailed(user.id)).filter((b) => b.status !== "Cancelled");
  // A buyer with several units in one project should see that project once.
  const projects = [...new Map(bookings.map((b) => [b.project.id, b.project])).values()];
  const [stages, updates] = await Promise.all([Promise.all(projects.map((p) => getProjectStages(p.id))), getPublishedUpdates(projects.map((p) => p.id))]);

  return (
    <PortalShell title="Project progress">
      {projects.length === 0 && <p className="text-sm text-stone-500">No project updates have been published yet.</p>}
      {projects.map((proj, i) => {
        const own = updates.filter((u) => u.projectId === proj.id).slice(0, 3);
        return (
          <div key={proj.id} className="mb-8 rounded-xl border bg-white p-4">
            <div className="flex items-baseline justify-between">
              <p className="font-medium">{proj.name}</p>
              <p className="text-2xl font-bold text-teal-800">{proj.progress_percent}%</p>
            </div>
            <div className="mt-4">
              <StageBars stages={stages[i]} />
            </div>
            {own.length > 0 && (
              <section aria-label={`Site updates for ${proj.name}`} className="mt-6 border-t pt-4">
                <h2 className="text-sm font-semibold">Latest from site</h2>
                <ul className="mt-3 space-y-4">
                  {own.map((u) => (
                    <li key={u.id}>
                      <p className="text-xs text-stone-500">
                        {u.publishedAt?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" })}
                      </p>
                      {u.text && <p className="mt-1 text-sm whitespace-pre-line text-stone-700">{u.text}</p>}
                      {u.photos.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {u.photos.filter(hasRealImage).map((src) => (
                            <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-stone-100">
                              <Image src={src} alt={`Site photo, ${proj.name}`} fill sizes="(min-width: 640px) 33vw, 50vw" className="object-cover" style={{ objectPosition: focalPosition(src) }} />
                            </a>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        );
      })}
    </PortalShell>
  );
}
