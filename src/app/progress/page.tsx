import Link from "next/link";
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
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-serif text-5xl leading-none text-balance">{page.title}</h1>
      {page.intro && <p className="mt-3 max-w-2xl text-stone-600">{page.intro}</p>}

      <nav aria-label="Jump to category" className="mt-6 flex flex-wrap gap-2 text-sm">
        {groups.map((g) => (
          <a key={g.key} href={`#${g.key}`} className="rounded-full border border-stone-200 bg-white px-3 py-1 hover:border-teal-400">
            {g.icon} {g.label} ({g.projects.length})
          </a>
        ))}
      </nav>

      {groups.length === 0 && <p className="mt-8 text-stone-500">No project updates have been published yet.</p>}

      {groups.map((g) => (
        <section key={g.key} id={g.key} aria-labelledby={`h-${g.key}`} className="mt-12 scroll-mt-24">
          <h2 id={`h-${g.key}`} className="text-2xl font-semibold">
            <span aria-hidden className="mr-2">
              {g.icon}
            </span>
            {g.label}
          </h2>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            {g.projects.map((p) => (
              <article key={p.id} className="rounded-xl border border-stone-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      <Link href={`/projects/${p.slug}`} className="hover:text-teal-800">
                        {p.name}
                      </Link>
                    </h3>
                    <p className="text-sm text-stone-500">
                      {labelOf(DIVISIONS, p.division)} · {p.status} · {p.expected_completion}
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-teal-800">{p.progress_percent}%</span>
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
  );
}
