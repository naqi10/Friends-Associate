import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { CONTAINER, PageHero } from "@/components/public/ui";
import { CoverImage } from "@/components/public/CoverImage";
import { CallbackForm } from "@/components/public/EnquiryForms";
import { formatPkr } from "@/lib/format";
import { getProjectById, getPropertyBySlugOrId } from "@/lib/data";
import { propertyPath } from "@/lib/property-slug";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await getPropertyBySlugOrId(id);
  if (!p || !p.published) return { title: "Property" };
  const deal = p.listing_type === "rent" ? "for rent" : "for sale";
  return pageMetadata({
    title: `${p.title} ${deal}, ${p.locality || p.city}`,
    description: `${p.type} · ${p.size} ${deal} in ${[p.locality, p.city].filter(Boolean).join(", ")} — ${formatPkr(p.price_pkr)}${p.listing_type === "rent" ? " per month" : ""}. Contact Friends Associates.`,
    path: propertyPath(p),
  });
}

export default async function PropertyDetailPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const property = await getPropertyBySlugOrId(id);
  if (!property || !property.published) notFound();
  // Old /properties/<uuid> links move permanently to the readable address (keeping ?sent= etc.).
  if (property.slug && id !== property.slug) {
    const qs = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string")).toString();
    permanentRedirect(`${propertyPath(property)}${qs ? `?${qs}` : ""}`);
  }
  const project = property.project_id ? await getProjectById(property.project_id) : undefined;
  const rent = property.listing_type === "rent";

  const facts = [
    { label: "Listing", value: rent ? "For rent" : "For sale" },
    { label: "Type", value: property.type },
    { label: "Size", value: property.size },
    { label: "Locality", value: property.locality },
    { label: "City", value: property.city },
    { label: "Availability", value: property.status },
  ].filter((f) => f.value);

  return (
    <div className="bg-paper text-ink">
      <PageHero
        title={property.title}
        eyebrow={`${rent ? "For rent" : "For sale"} · ${property.type}`}
        intro={[property.size, [property.locality, property.city].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
        crumbs={[{ href: "/", label: "Home" }, { href: `/properties?tab=${rent ? "rent" : "buy"}`, label: rent ? "Rent" : "Buy" }, { label: property.title }]}
      >
        <p className="font-serif text-[clamp(40px,5vw,56px)] leading-none">
          {formatPkr(property.price_pkr)}
          {rent && <span className="font-sans text-lg text-muted"> / month</span>}
        </p>
      </PageHero>

      <div className={`${CONTAINER} py-12 md:py-16`}>
      <div className="overflow-hidden rounded-tile">
        <CoverImage src={property.image_path} alt={property.title} className="h-64 md:h-[460px]" sizes="(min-width: 1280px) 1232px, 100vw" preload />
      </div>

      <div className="mt-12 grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <h2 className="font-serif text-[36px] leading-none">Details</h2>
          <dl className="mt-6 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.label} className="bg-paper p-5">
                <dt className="text-xs tracking-[0.12em] text-muted uppercase">{f.label}</dt>
                <dd className="mt-1.5 text-[17px] font-semibold">{f.value}</dd>
              </div>
            ))}
          </dl>
          {property.description && <p className="mt-8 whitespace-pre-line text-[17px] leading-relaxed text-body">{property.description}</p>}
          {project && project.published && (
            <div className="mt-8 rounded-card bg-mist p-6 text-[15px]">
              <p>
                Part of{" "}
                <Link href={`/projects/${project.slug}`} className="font-semibold text-ink underline underline-offset-4">
                  {project.name}
                </Link>{" "}
                — {project.progress_percent}% complete.
              </p>
              {project.payment_plan && <p className="mt-2 text-body">Payment plan: {project.payment_plan}</p>}
            </div>
          )}
        </div>
        <aside className="lg:sticky lg:top-28">
          <CallbackForm
            returnTo={propertyPath(property)}
            propertyId={property.id}
            sent={sp.sent}
            error={sp.error}
            title={rent ? "Interested in renting?" : "Interested in buying?"}
          />
        </aside>
      </div>
      </div>
    </div>
  );
}
