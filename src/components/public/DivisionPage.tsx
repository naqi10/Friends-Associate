import Link from "next/link";
import { ProjectCard } from "@/components/public/Cards";
import Image from "next/image";
import { DIVISIONS, PROJECT_CATEGORIES, isKey, type Division } from "@/lib/catalog";
import { getPageContent, getProjectCategoryCounts, getProjectsFiltered, getPublishedServices } from "@/lib/data";
import { focalPosition, hasRealImage } from "@/lib/media";
import { BRAND } from "@/lib/brand";

/** Landing page for one division (Architecture or Construction): services, categories and projects. */
export async function DivisionPage({ division, category }: { division: Division; category?: string }) {
  const meta = DIVISIONS.find((d) => d.key === division)!;
  const activeCategory = isKey(PROJECT_CATEGORIES, category) ? category : undefined;
  const [page, services, counts, projects] = await Promise.all([
    getPageContent(`page.${division}`),
    getPublishedServices(division),
    getProjectCategoryCounts(division),
    getProjectsFiltered({ division, category: activeCategory, publishedOnly: true }),
  ]);

  return (
    <div>
      <section className="border-b border-stone-200 bg-gradient-to-br from-stone-100 to-teal-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{BRAND.name}</p>
          <h1 className="mt-2 font-serif text-5xl leading-none text-balance md:text-6xl">{page.title}</h1>
          {page.intro && <p className="mt-4 max-w-2xl text-lg text-stone-600">{page.intro}</p>}
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

      {services.length > 0 && (
        <section aria-labelledby="services" className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="services" className="font-serif text-4xl leading-tight text-balance">
            Services
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <article key={s.id} className="flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white">
                {hasRealImage(s.imagePath) && (
                  <Image src={s.imagePath} alt="" width={600} height={340} sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw" className="h-40 w-full object-cover" style={{ objectPosition: focalPosition(s.imagePath) }} />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-semibold">
                    {s.icon && (
                      <span aria-hidden className="mr-2">
                        {s.icon}
                      </span>
                    )}
                    {s.name}
                  </h3>
                  {s.shortDescription && <p className="mt-2 text-sm text-stone-600">{s.shortDescription}</p>}
                  {s.features.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-stone-600">
                      {s.features.map((f) => (
                        <li key={f}>• {f}</li>
                      ))}
                    </ul>
                  )}
                  {(s.startingPrice || s.estimatedDuration) && (
                    <dl className="mt-4 space-y-1 text-xs text-stone-500">
                      {s.startingPrice && (
                        <div>
                          <dt className="inline">Price: </dt>
                          <dd className="inline font-medium text-stone-700">{s.startingPrice}</dd>
                        </div>
                      )}
                      {s.estimatedDuration && (
                        <div>
                          <dt className="inline">Duration: </dt>
                          <dd className="inline font-medium text-stone-700">{s.estimatedDuration}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  {s.ctaText && s.ctaUrl && (
                    <Link href={s.ctaUrl} className="mt-auto pt-4 text-sm font-semibold text-teal-800 hover:underline">
                      {s.ctaText} →
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="categories" className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="categories" className="font-serif text-4xl leading-tight text-balance">
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
