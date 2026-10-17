import Link from "next/link";
import type { Metadata } from "next";
import { ProjectCard } from "@/components/public/Cards";
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
  const select = "rounded-md border border-stone-300 px-3 py-2";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl font-semibold">{page.title}</h1>
        <Link href="/progress" className="text-sm font-medium text-teal-800 hover:underline">
          See construction progress by category →
        </Link>
      </div>
      {page.intro && <p className="mt-3 max-w-2xl text-stone-600">{page.intro}</p>}
      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-500">Division</span>
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
          <span className="text-xs font-medium text-stone-500">Category</span>
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
          <span className="text-xs font-medium text-stone-500">City</span>
          <select name="city" defaultValue={filter.city ?? ""} className={select}>
            <option value="">All</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md bg-teal-800 px-4 py-2 font-medium text-white hover:bg-teal-900">
          Apply filters
        </button>
        {filtered && (
          <Link href="/projects" className="px-2 py-2 text-stone-600 hover:underline">
            Clear
          </Link>
        )}
      </form>
      <p className="mt-4 text-sm text-stone-500" aria-live="polite">
        {projects.length} {projects.length === 1 ? "project" : "projects"}
      </p>
      {projects.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-stone-300 p-6 text-center text-stone-500">No projects match these filters.</p>
      ) : (
        <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
