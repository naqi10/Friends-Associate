import Image from "next/image";
import { PortalShell } from "@/components/PortalShell";
import { CARD, ProgressBar } from "@/components/portal/ui";
import { StageBars } from "@/components/StageBars";
import { getProjectStages, getPublishedUpdates } from "@/lib/data";
import { focalPosition, hasRealImage } from "@/lib/media";
import { getPortal } from "@/lib/portal";

export const metadata = { title: "Project progress", robots: { index: false } };

export default async function PortalProgressPage() {
  const { active } = await getPortal();
  // A buyer with several units in one project should see that project once.
  const projects = [...new Map(active.map((b) => [b.project.id, b.project])).values()];
  const [stages, updates] = await Promise.all([Promise.all(projects.map((p) => getProjectStages(p.id))), getPublishedUpdates(projects.map((p) => p.id))]);

  return (
    <PortalShell title="Construction progress" subtitle="Photos and updates from your site">
      {projects.length === 0 && <p className="rounded-2xl bg-mist p-5 text-[16px]">No project updates yet.</p>}
      <div className="space-y-6">
        {projects.map((proj, i) => {
          const own = updates.filter((u) => u.projectId === proj.id).slice(0, 5);
          return (
            <section key={proj.id} aria-label={proj.name} className="grid items-start gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
              <div className={`${CARD} p-6`}>
                <p className="text-[15px] text-muted">{proj.status}</p>
                <h2 className="text-[24px] font-semibold">{proj.name}</h2>
                <ProgressBar label="Overall" percent={proj.progress_percent} className="mt-5" />
                <div className="mt-6 border-t border-line pt-5">
                  <StageBars stages={stages[i]} />
                </div>
              </div>
              <div className={`${CARD} p-6`}>
                <h3 className="text-[20px] font-semibold">Latest from site</h3>
                {own.length === 0 ? (
                  <p className="mt-3 rounded-[18px] bg-mist p-5 text-[15px] text-muted">Our project team posts photos and news here as work moves ahead. You get a notification for each update.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-line">
                    {own.map((u) => (
                      <li key={u.id} className="py-5">
                        <p className="text-[14px] font-semibold text-muted">
                          {u.publishedAt?.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Karachi" })}
                        </p>
                        {u.text && <p className="mt-1.5 text-[16px] leading-relaxed whitespace-pre-line text-body">{u.text}</p>}
                        {u.photos.filter(hasRealImage).length > 0 && (
                          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {u.photos.filter(hasRealImage).map((src) => (
                              <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-mist">
                                <Image src={src} alt={`Site photo, ${proj.name}`} fill sizes="(min-width: 640px) 33vw, 50vw" className="object-cover" style={{ objectPosition: focalPosition(src) }} />
                              </a>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </PortalShell>
  );
}
