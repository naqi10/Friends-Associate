import Link from "next/link";
import { CoverImage } from "@/components/public/CoverImage";
import { PROJECT_CATEGORIES, DIVISIONS, labelOf } from "@/lib/catalog";
import { formatPkr } from "@/lib/format";
import type { Project, Property } from "@/lib/types";
import { propertyPath } from "@/lib/property-slug";

export function ProjectCard({ p }: { p: Project }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md">
      <CoverImage src={p.image_path} alt={p.name} />
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-teal-800">
          {labelOf(DIVISIONS, p.division)} · {labelOf(PROJECT_CATEGORIES, p.category)}
        </p>
        <h3 className="mt-1 text-lg font-semibold">
          <Link href={`/projects/${p.slug}`} className="after:absolute after:inset-0 group-hover:text-teal-800">
            <span className="relative">{p.name}</span>
          </Link>
        </h3>
        <p className="text-sm text-stone-600">
          {p.location ? `${p.location}, ` : ""}
          {p.city}
        </p>
        <div className="mt-auto pt-4">
          <div className="flex items-baseline justify-between text-xs text-stone-500">
            <span>{p.status}</span>
            <span className="font-semibold text-stone-700">{p.progress_percent}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100" aria-hidden>
            <div className="h-full rounded-full bg-teal-700" style={{ width: `${p.progress_percent}%` }} />
          </div>
        </div>
      </div>
    </article>
  );
}

export function PropertyCard({ p }: { p: Property & { project_name?: string | null } }) {
  const rent = p.listing_type === "rent";
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative">
        <CoverImage src={p.image_path} alt={p.title} className="h-40" />
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${rent ? "bg-sky-100 text-sky-900" : "bg-amber-100 text-amber-900"}`}
        >
          {rent ? "For rent" : "For sale"}
        </span>
        {p.status !== "Available" && (
          <span className="absolute right-3 top-3 rounded-full bg-stone-900/80 px-2.5 py-0.5 text-xs font-semibold text-white">{p.status}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold">
          <Link href={propertyPath(p)} className="after:absolute after:inset-0 group-hover:text-teal-800">
            {p.title}
          </Link>
        </h3>
        <p className="text-sm text-stone-600">
          {p.type} · {p.size}
        </p>
        <p className="text-sm text-stone-500">
          {[p.locality, p.city].filter(Boolean).join(", ")}
          {p.project_name ? ` · ${p.project_name}` : ""}
        </p>
        <p className="mt-auto pt-3 text-lg font-semibold text-teal-900">
          {formatPkr(p.price_pkr)}
          {rent && <span className="text-sm font-normal text-stone-500"> / month</span>}
        </p>
      </div>
    </article>
  );
}
