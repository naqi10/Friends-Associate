import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
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
    <div className="mx-auto max-w-5xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-stone-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        /{" "}
        <Link href={`/properties?tab=${rent ? "rent" : "buy"}`} className="hover:underline">
          {rent ? "Rent" : "Buy"}
        </Link>{" "}
        / <span className="text-stone-700">{property.title}</span>
      </nav>

      <div className="mt-4 overflow-hidden rounded-2xl">
        <CoverImage src={property.image_path} alt={property.title} className="h-64 md:h-80" sizes="(min-width: 1024px) 1024px, 100vw" preload />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div>
          <h1 className="font-serif text-5xl leading-none text-balance">{property.title}</h1>
          <p className="mt-3 text-3xl font-semibold text-teal-900">
            {formatPkr(property.price_pkr)}
            {rent && <span className="text-lg font-normal text-stone-500"> / month</span>}
          </p>
          {property.description && <p className="mt-6 whitespace-pre-line leading-relaxed text-stone-700">{property.description}</p>}
          <dl className="mt-8 grid gap-4 rounded-xl border border-stone-200 bg-white p-5 sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="text-xs text-stone-500">{f.label}</dt>
                <dd className="font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
          {project && project.published && (
            <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5 text-sm">
              <p>
                Part of{" "}
                <Link href={`/projects/${project.slug}`} className="font-medium text-teal-800 hover:underline">
                  {project.name}
                </Link>{" "}
                — {project.progress_percent}% complete.
              </p>
              {project.payment_plan && <p className="mt-2 text-stone-600">Payment plan: {project.payment_plan}</p>}
            </div>
          )}
        </div>
        <aside>
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
  );
}
