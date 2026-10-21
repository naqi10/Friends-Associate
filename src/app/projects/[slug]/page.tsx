import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PropertyCard } from "@/components/public/Cards";
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
    <div className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbs)} />
      <nav aria-label="Breadcrumb" className="text-sm text-stone-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        /{" "}
        <Link href={division?.path ?? "/projects"} className="hover:underline">
          {division?.label ?? "Projects"}
        </Link>{" "}
        / <span className="text-stone-700">{project.name}</span>
      </nav>

      <div className="mt-4 overflow-hidden rounded-2xl">
        <CoverImage src={project.image_path} alt={project.name} className="h-64 md:h-80" sizes="(min-width: 1024px) 1024px, 100vw" preload />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800">
            {division?.label} · {labelOf(PROJECT_CATEGORIES, project.category)}
          </p>
          <h1 className="mt-1 font-serif text-5xl leading-none text-balance">{project.name}</h1>
          <p className="mt-2 text-stone-600">
            {[project.location, project.city].filter(Boolean).join(", ")} · {project.developer}
          </p>
          <p className="mt-6 whitespace-pre-line leading-relaxed text-stone-700">{project.description}</p>

          <section aria-labelledby="progress" className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 id="progress" className="text-xl font-semibold">
                Project progress
              </h2>
              <span className="text-2xl font-bold text-teal-800">{project.progress_percent}%</span>
            </div>
            <div className="mt-4 rounded-xl border border-stone-200 bg-white p-5">
              <StageBars stages={stages} />
            </div>
          </section>

          {lists.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-semibold">Sizes, plans & amenities</h2>
              <ul className="mt-3 grid list-inside list-disc gap-1 text-stone-700 sm:grid-cols-2">
                {lists.map((l) => (
                  <li key={l.id}>{l.label}</li>
                ))}
              </ul>
            </section>
          )}

          {units.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-semibold">Units in this project</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {units.map((u) => (
                  <PropertyCard key={u.id} p={u} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {details.length > 0 && (
            <dl className="space-y-3 rounded-xl border border-stone-200 bg-white p-5 text-sm">
              {details.map((d) => (
                <div key={d.label}>
                  <dt className="text-stone-500">{d.label}</dt>
                  <dd className="font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {investments.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm">
              <p className="font-semibold text-amber-900">Investment opportunity</p>
              {investments.map((i) => (
                <Link key={i.slug} href={`/investment/${i.slug}`} className="mt-2 block text-amber-900 underline">
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
  );
}
