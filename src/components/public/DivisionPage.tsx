import Image from "next/image";
import Link from "next/link";
import { CategoryIcon } from "@/components/home/icons";
import { ProjectCard } from "@/components/public/Cards";
import { BTN_DARK, BTN_OUTLINE, CONTAINER, PageHero, SectionHead } from "@/components/public/ui";
import { BRAND } from "@/lib/brand";
import { DIVISIONS, PROJECT_CATEGORIES, isKey, type Division } from "@/lib/catalog";
import { getPageContent, getProjectCategoryCounts, getProjectsFiltered, getPublishedServices } from "@/lib/data";
import { plural } from "@/lib/format";
import { focalPosition, hasRealImage } from "@/lib/media";

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
    <div className="bg-paper text-ink">
      <PageHero title={page.title} intro={page.intro} eyebrow={meta.label}>
        <Link href="/contact#enquiry" className={BTN_DARK}>
          Get a quotation <span aria-hidden>→</span>
        </Link>
        <a href={`https://wa.me/${BRAND.phoneIntl.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className={BTN_OUTLINE}>
          WhatsApp {BRAND.phone}
        </a>
      </PageHero>

      {services.length > 0 && (
        <section aria-labelledby="services" className={`${CONTAINER} py-20`}>
          <SectionHead id="services" eyebrow="What we do" title="Services" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {services.map((s) => (
              <article key={s.id} className="flex flex-col overflow-hidden rounded-card border border-line bg-paper">
                {hasRealImage(s.imagePath) && (
                  <Image src={s.imagePath} alt="" width={600} height={340} sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw" className="h-44 w-full object-cover" style={{ objectPosition: focalPosition(s.imagePath) }} />
                )}
                <div className="flex flex-1 flex-col p-6">
                  {s.icon && (
                    <span aria-hidden className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-mist text-xl">
                      {s.icon}
                    </span>
                  )}
                  <h3 className="text-[19px] font-semibold">{s.name}</h3>
                  {s.shortDescription && <p className="mt-2 text-[15px] leading-relaxed text-body">{s.shortDescription}</p>}
                  {s.features.length > 0 && (
                    <ul className="mt-4 space-y-2 text-sm text-body">
                      {s.features.map((f) => (
                        <li key={f} className="flex gap-2.5">
                          <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  {(s.startingPrice || s.estimatedDuration) && (
                    <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                      {s.startingPrice && (
                        <div>
                          <dt className="text-xs text-muted">Price</dt>
                          <dd className="font-semibold">{s.startingPrice}</dd>
                        </div>
                      )}
                      {s.estimatedDuration && (
                        <div>
                          <dt className="text-xs text-muted">Duration</dt>
                          <dd className="font-semibold">{s.estimatedDuration}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  {s.ctaText && s.ctaUrl && (
                    <Link href={s.ctaUrl} className="mt-auto w-fit border-b border-ink pt-5 pb-1 text-[15px] font-semibold hover:text-muted">
                      {s.ctaText} <span aria-hidden>→</span>
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="categories" className="bg-mist">
        <div className={`${CONTAINER} py-20`}>
          <SectionHead id="categories" eyebrow="Our work" title="Projects by category" />
          <nav aria-label="Project categories" className="grid gap-px border border-line-strong bg-line-strong sm:grid-cols-2 lg:grid-cols-4">
            {PROJECT_CATEGORIES.map((c) => {
              const active = activeCategory === c.key;
              return (
                <Link
                  key={c.key}
                  href={active ? meta.path : `${meta.path}?category=${c.key}#projects`}
                  aria-current={active ? "true" : undefined}
                  className={`flex min-h-[150px] flex-col justify-between gap-6 p-6 transition ${active ? "bg-ink text-paper" : "bg-paper hover:bg-mist"}`}
                >
                  <CategoryIcon category={c.key} className={active ? "text-paper" : "text-ink"} />
                  <span className="flex items-end justify-between gap-3">
                    <span>
                      <span className="block text-lg font-semibold">{c.label}</span>
                      <span className={`block text-xs ${active ? "text-faint" : "text-muted"}`}>{c.examples}</span>
                    </span>
                    <span className={`whitespace-nowrap text-[13px] ${active ? "text-faint" : "text-muted"}`}>{plural(counts[c.key] ?? 0, "project")}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      <section id="projects" aria-labelledby="projects-title" className={`${CONTAINER} scroll-mt-24 py-20`}>
        <SectionHead
          id="projects-title"
          eyebrow={activeCategory ? PROJECT_CATEGORIES.find((c) => c.key === activeCategory)!.label : undefined}
          title={`${meta.label} projects`}
        />
        {activeCategory && (
          <p className="-mt-6 mb-10 text-center">
            <Link href={meta.path} className="border-b border-ink pb-1 text-[15px] font-semibold hover:text-muted">
              Show all categories
            </Link>
          </p>
        )}
        {projects.length === 0 ? (
          <p className="mx-auto max-w-xl rounded-card border border-dashed border-line-strong p-8 text-center text-body">
            No projects published in this category yet.{" "}
            <Link href="/contact#enquiry" className="font-semibold text-ink underline">
              Contact us to discuss yours
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
