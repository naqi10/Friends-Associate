import Link from "next/link";
import { CONTAINER, PageHero } from "@/components/public/ui";
import type { Metadata } from "next";
import { StageBars } from "@/components/StageBars";
import { DIVISIONS, PROJECT_CATEGORIES, labelOf } from "@/lib/catalog";
import { getPageContent, getProjectsFiltered } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Project progress",
  description: "Live construction and design progress for every Friends Associates project, stage by stage.",
  path: "/progress",
});

export default async function ProgressPage() {
  const [projects, page] = await Promise.all([getProjectsFiltered({ publishedOnly: true }), getPageContent("page.progress")]);
  // Category-wise, as the brief asks: each category lists its projects with stage percentages.
  const groups = PROJECT_CATEGORIES.map((c) => ({ ...c, projects: projects.filter((p) => p.category === c.key) })).filter(
    (g) => g.projects.length > 0,
  );

  return (
    <div className="bg-paper text-ink">
      <PageHero title={page.title} intro={page.intro} eyebrow="Live progress">
        {groups.map((g) => (
          <a key={g.key} href={`#${g.key}`} className="rounded-full border-[1.5px] border-line-strong px-4 py-2 text-sm font-semibold hover:border-ink">
            {g.icon} {g.label} ({g.projects.length})
          </a>
        ))}
      </PageHero>
      <div className={`${CONTAINER} pb-20`}>

      {groups.length === 0 && <p className="mx-auto mt-14 max-w-xl rounded-card border border-dashed border-line-strong p-8 text-center text-body">No project updates have been published yet.</p>}

      {groups.map((g) => (
        <section key={g.key} id={g.key} aria-labelledby={`h-${g.key}`} className="mt-16 scroll-mt-28">
          <h2 id={`h-${g.key}`} className="text-center font-serif text-[clamp(32px,4vw,48px)] leading-none">
            <span aria-hidden className="mr-2">
              {g.icon}
            </span>
            {g.label}
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {g.projects.map((p) => (
              <article key={p.id} className="rounded-card border border-line bg-paper p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      <Link href={`/projects/${p.slug}`} className="hover:text-muted">
                        {p.name}
                      </Link>
                    </h3>
                    <p className="text-sm text-muted">
                      {labelOf(DIVISIONS, p.division)} · {p.status} · {p.expected_completion}
                    </p>
                  </div>
                  <span className="font-serif text-[40px] leading-none">{p.progress_percent}%</span>
                </div>
                <div className="mt-4">
                  <StageBars stages={p.stages} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
      </div>
    </div>
  );
}
