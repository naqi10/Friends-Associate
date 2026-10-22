import Link from "next/link";
import type { Metadata } from "next";
import { ProjectCard } from "@/components/public/Cards";
import { BTN_OUTLINE, CONTAINER, PageHero } from "@/components/public/ui";
import { DIVISIONS, PROJECT_CATEGORIES, isKey } from "@/lib/catalog";
import { CITIES } from "@/lib/constants";
import { getPageContent, getProjectsFiltered } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Projects",
  description: "Residential, commercial, industrial, hospitality, healthcare, educational and recreational projects by Friends Associates.",
  path: "/projects",
});

type Props = { searchParams: Promise<{ division?: string; category?: string; city?: string }> };

export default async function ProjectsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filter = {
    division: isKey(DIVISIONS, sp.division) ? sp.division : undefined,
    category: isKey(PROJECT_CATEGORIES, sp.category) ? sp.category : undefined,
    city: (CITIES as readonly string[]).includes(sp.city ?? "") ? sp.city : undefined,
  };
  const [projects, page] = await Promise.all([getProjectsFiltered({ ...filter, publishedOnly: true }), getPageContent("page.projects")]);
  const filtered = Object.values(filter).some(Boolean);
  const select = "min-w-[170px] rounded-xl border-[1.5px] border-line-strong bg-paper px-3 py-2.5 text-[15px] text-ink outline-none focus:border-ink";

  return (
    <div className="bg-paper text-ink">
      <PageHero title={page.title} intro={page.intro} eyebrow="Our work">
        <Link href="/progress" className={BTN_OUTLINE}>
          See construction progress <span aria-hidden className="ml-1">→</span>
        </Link>
      </PageHero>
      <div className={`${CONTAINER} pb-20`}>
      <form method="get" className="mx-auto mt-10 flex max-w-[900px] flex-wrap items-end justify-center gap-4 rounded-card border border-line bg-paper p-5 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Division</span>
          <select name="division" defaultValue={filter.division ?? ""} className={select}>
            <option value="">All</option>
            {DIVISIONS.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Category</span>
          <select name="category" defaultValue={filter.category ?? ""} className={select}>
            <option value="">All</option>
            {PROJECT_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">City</span>
          <select name="city" defaultValue={filter.city ?? ""} className={select}>
            <option value="">All</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-full bg-ink px-6 py-2.5 font-semibold text-paper hover:bg-body">
          Apply filters
        </button>
        {filtered && (
          <Link href="/projects" className="rounded-full border-[1.5px] border-line-strong px-5 py-2.5 font-semibold text-ink hover:bg-mist">
            Clear
          </Link>
        )}
      </form>
      <p className="mt-8 mb-6 text-center text-sm text-muted" aria-live="polite">
        {projects.length} {projects.length === 1 ? "project" : "projects"}
      </p>
      {projects.length === 0 ? (
        <p className="mx-auto max-w-xl rounded-card border border-dashed border-line-strong p-8 text-center text-body">No projects match these filters.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
