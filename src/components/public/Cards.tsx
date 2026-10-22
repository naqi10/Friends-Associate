import Link from "next/link";
import { HomeImage, Pill } from "@/components/home/HomeImage";
import { PROJECT_CATEGORIES, DIVISIONS, labelOf } from "@/lib/catalog";
import { formatPkr } from "@/lib/format";
import { propertyPath } from "@/lib/property-slug";
import type { Project, Property } from "@/lib/types";

/** Same look as the home page cards: photo with labels, title, place, then progress or price. */
const CARD = "group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-paper transition-transform duration-200 hover:-translate-y-1";

export function ProjectCard({ p }: { p: Project }) {
  return (
    <article className={CARD}>
      <HomeImage src={p.image_path} alt={p.name} className="h-[230px]">
        <div className="flex w-full items-start justify-between gap-2 p-3.5">
          <Pill>
            {labelOf(DIVISIONS, p.division)} · {labelOf(PROJECT_CATEGORIES, p.category)}
          </Pill>
          <Pill tone="dark">{p.progress_percent}%</Pill>
        </div>
      </HomeImage>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-[19px] font-semibold text-ink">
            <Link href={`/projects/${p.slug}`} className="after:absolute after:inset-0">
              {p.name}
            </Link>
          </h3>
          <p className="text-sm text-muted">{[p.location, p.city].filter(Boolean).join(", ")}</p>
        </div>
        <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
          <div className="flex justify-between text-[13px] text-body">
            <span>{p.status}</span>
            <span>{p.progress_percent}%</span>
          </div>
          <div className="h-[3px] overflow-hidden rounded-sm bg-line" aria-hidden>
            <div className="h-full bg-ink" style={{ width: `${p.progress_percent}%` }} />
          </div>
        </div>
      </div>
    </article>
  );
}

export function PropertyCard({ p }: { p: Property & { project_name?: string | null } }) {
  const rent = p.listing_type === "rent";
  return (
    <article className={CARD}>
      <HomeImage src={p.image_path} alt={p.title} className="h-[220px]">
        <div className="flex w-full items-start justify-between gap-2 p-3.5">
          <Pill tone="dark">{rent ? "For rent" : "For sale"}</Pill>
          {p.status !== "Available" ? <Pill>{p.status}</Pill> : <Pill>{p.city}</Pill>}
        </div>
      </HomeImage>
      <div className="flex flex-1 flex-col gap-3.5 p-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-[19px] font-semibold text-ink">
            <Link href={propertyPath(p)} className="after:absolute after:inset-0">
              {p.title}
            </Link>
          </h3>
          <p className="text-sm text-muted">
            {[p.locality, p.city].filter(Boolean).join(", ")}
            {p.project_name ? ` · ${p.project_name}` : ""}
          </p>
        </div>
        <div className="flex gap-4 border-t border-line pt-3.5 text-[13px] text-body">
          <span>{p.type}</span>
          <span aria-hidden>·</span>
          <span>{p.size}</span>
        </div>
        <div className="mt-auto flex items-baseline justify-between gap-3">
          <span>
            <span className="font-serif text-[30px] leading-none text-ink">{formatPkr(p.price_pkr)}</span>
            {rent && <span className="text-[13px] text-muted"> / month</span>}
          </span>
          <span className="text-sm font-semibold text-ink">
            Details <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </article>
  );
}
