import Link from "next/link";
import { ProjectCard } from "@/components/public/Cards";
import { DIVISIONS, PROJECT_CATEGORIES, SERVICES, isKey, type Division } from "@/lib/catalog";
import { getProjectCategoryCounts, getProjectsFiltered } from "@/lib/data";
import { BRAND } from "@/lib/brand";

/** Landing page for one division (Architecture or Construction): services, categories and projects. */
export async function DivisionPage({ division, category }: { division: Division; category?: string }) {
  const meta = DIVISIONS.find((d) => d.key === division)!;
  const activeCategory = isKey(PROJECT_CATEGORIES, category) ? category : undefined;
  const [counts, projects] = await Promise.all([
    getProjectCategoryCounts(division),
    getProjectsFiltered({ division, category: activeCategory, publishedOnly: true }),
  ]);

  return (
    <div>
      <section className="border-b border-stone-200 bg-gradient-to-br from-stone-100 to-teal-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{BRAND.name}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">{meta.label}</h1>
          <p className="mt-4 max-w-2xl text-lg text-stone-600">{meta.summary}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact#enquiry" className="rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400">
              Get a quotation
            </Link>
            <a
              href={`https://wa.me/${BRAND.phoneIntl.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-50"
            >
              WhatsApp {BRAND.phone}
            </a>
          </div>
        </div>
      </section>

      <section aria-labelledby="services" className="mx-auto max-w-6xl px-4 py-14">
        <h2 id="services" className="font-display text-3xl font-semibold">
          Services
        </h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {SERVICES[division].map((g) => (
            <article key={g.title} className="rounded-xl border border-stone-200 bg-white p-5">
              <h3 className="font-semibold">
                <span aria-hidden className="mr-2">
                  {g.icon}
                </span>
                {g.title}
              </h3>
              <ul className="mt-3 space-y-1 text-sm text-stone-600">
                {g.items.map((i) => (
                  <li key={i}>• {i}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="categories" className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="categories" className="font-display text-3xl font-semibold">
            Projects by category
          </h2>
          <nav aria-label="Project categories" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PROJECT_CATEGORIES.map((c) => {
              const active = activeCategory === c.key;
              return (
                <Link
                  key={c.key}
                  href={active ? meta.path : `${meta.path}?category=${c.key}#projects`}
                  aria-current={active ? "true" : undefined}
                  className={`rounded-xl border p-4 transition ${active ? "border-teal-700 bg-teal-50" : "border-stone-200 hover:border-teal-400"}`}
                >
                  <p className="font-semibold">
                    <span aria-hidden className="mr-2">
                      {c.icon}
                    </span>
                    {c.label}
                    <span className="ml-2 text-sm font-normal text-stone-500">({counts[c.key] ?? 0})</span>
                  </p>
                  <p className="mt-1 text-xs text-stone-500">{c.examples}</p>
                </Link>
              );
            })}
          </nav>

          <div id="projects" className="scroll-mt-24 pt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xl font-semibold">
                {activeCategory ? PROJECT_CATEGORIES.find((c) => c.key === activeCategory)!.label : "All"} {meta.label.toLowerCase()} projects
              </h3>
              {activeCategory && (
                <Link href={meta.path} className="text-sm text-teal-800 hover:underline">
                  Show all categories
                </Link>
              )}
            </div>
            {projects.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-stone-300 p-6 text-center text-stone-500">
                No projects published in this category yet. Contact us to discuss yours.
              </p>
            ) : (
              <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((p) => (
                  <ProjectCard key={p.id} p={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
