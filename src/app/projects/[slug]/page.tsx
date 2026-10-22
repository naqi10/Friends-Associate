import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PropertyCard } from "@/components/public/Cards";
import { CONTAINER, PageHero } from "@/components/public/ui";
import { CoverImage } from "@/components/public/CoverImage";
import { CallbackForm } from "@/components/public/EnquiryForms";
import { StageBars } from "@/components/StageBars";
import { DIVISIONS, PROJECT_CATEGORIES, labelOf } from "@/lib/catalog";
import {
  getInvestmentsForProject,
  getProjectBySlug,
  getProjectLists,
  getProjectStages,
  getPropertiesWithProject,
} from "@/lib/data";
import { formatPkr } from "@/lib/format";
import { absoluteUrl, jsonLd, pageMetadata, metaDescription } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ sent?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProjectBySlug(slug);
  if (!p || !p.published) return { title: "Project" };
  return pageMetadata({
    title: p.seo_title ?? `${p.name} — ${labelOf(PROJECT_CATEGORIES, p.category)} project, ${p.city}`,
    description: metaDescription(p.seo_description || p.description, `${p.name} by Friends Associates.`),
    path: `/projects/${p.slug}`,
  });
}

export default async function ProjectDetailPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const project = await getProjectBySlug(slug);
  if (!project || !project.published) notFound();

  const [lists, stages, units, investments] = await Promise.all([
    getProjectLists(project.id),
    getProjectStages(project.id),
    getPropertiesWithProject({ projectId: project.id, publishedOnly: true }),
    getInvestmentsForProject(project.id),
  ]);
  const division = DIVISIONS.find((d) => d.key === project.division);

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: division?.label ?? "Projects", item: absoluteUrl(division?.path ?? "/projects") },
      { "@type": "ListItem", position: 3, name: project.name, item: absoluteUrl(`/projects/${project.slug}`) },
    ],
  };

  const details = [
    { label: "Status", value: project.status },
    { label: "Expected completion", value: project.expected_completion },
    { label: "Pricing", value: project.pricing_label },
    { label: "Payment plan", value: project.payment_plan },
    { label: "Contact", value: [project.contact_person, project.contact_phone].filter(Boolean).join(" · ") },
  ].filter((d) => d.value);

  return (
    <div className="bg-paper text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbs)} />
      <PageHero
        title={project.name}
        eyebrow={`${division?.label ?? "Project"} · ${labelOf(PROJECT_CATEGORIES, project.category)}`}
        intro={[[project.location, project.city].filter(Boolean).join(", "), project.developer].filter(Boolean).join(" · ")}
        crumbs={[{ href: "/", label: "Home" }, { href: division?.path ?? "/projects", label: division?.label ?? "Projects" }, { label: project.name }]}
      >
        <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper">
          {project.status} · {project.progress_percent}%
        </span>
      </PageHero>

      <div className={`${CONTAINER} py-12 md:py-16`}>
      <div className="overflow-hidden rounded-tile">
        <CoverImage src={project.image_path} alt={project.name} className="h-64 md:h-[460px]" sizes="(min-width: 1280px) 1232px, 100vw" preload />
      </div>

      <div className="mt-12 grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <p className="whitespace-pre-line text-[17px] leading-relaxed text-body">{project.description}</p>

          <section aria-labelledby="progress" className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 id="progress" className="font-serif text-[36px] leading-none">
                Project progress
              </h2>
              <span className="font-serif text-[40px] leading-none">{project.progress_percent}%</span>
            </div>
            <div className="mt-4 rounded-card border border-line bg-paper p-5">
              <StageBars stages={stages} />
            </div>
          </section>

          {lists.length > 0 && (
            <section className="mt-10">
              <h2 className="font-serif text-[36px] leading-none">Sizes, plans & amenities</h2>
              <ul className="mt-5 grid gap-x-6 gap-y-2.5 text-body sm:grid-cols-2">
                {lists.map((l) => (
                  <li key={l.id} className="flex gap-2.5">
                    <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                    {l.label}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {units.length > 0 && (
            <section className="mt-10">
              <h2 className="font-serif text-[36px] leading-none">Units in this project</h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {units.map((u) => (
                  <PropertyCard key={u.id} p={u} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28">
          {details.length > 0 && (
            <dl className="space-y-3 rounded-card border border-line bg-paper p-5 text-sm">
              {details.map((d) => (
                <div key={d.label}>
                  <dt className="text-muted">{d.label}</dt>
                  <dd className="font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {investments.length > 0 && (
            <div className="rounded-card bg-ink p-6 text-sm text-paper">
              <p className="text-xs font-semibold tracking-[0.2em] text-dim uppercase">Investment opportunity</p>
              {investments.map((i) => (
                <Link key={i.slug} href={`/investment/${i.slug}`} className="mt-3 block text-[15px] font-semibold underline underline-offset-4">
                  {i.title} — from {formatPkr(i.minimumInvestmentPkr)}
                </Link>
              ))}
            </div>
          )}
          <CallbackForm
            returnTo={`/projects/${project.slug}`}
            projectId={project.id}
            interest={`Project: ${project.name}`}
            sent={sp.sent}
            error={sp.error}
            title="Talk to us about this project"
          />
        </aside>
      </div>
      </div>
    </div>
  );
}
