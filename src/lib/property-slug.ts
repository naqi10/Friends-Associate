import type { PrismaClient } from "@prisma/client";

/** "1 Kanal House, Abbasia Town" → "1-kanal-house-abbasia-town" (same rule as the slug migration). */
export function slugify(text: string, max = 80) {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
  return s || "property";
}

/** A free slug for a new listing: the title (+ locality if the title does not name it), with -2, -3 … when already used. */
export async function uniquePropertySlug(db: Pick<PrismaClient, "property">, title: string, locality: string) {
  const withPlace = locality && !title.toLowerCase().includes(locality.toLowerCase()) ? `${title} ${locality}` : title;
  const base = slugify(withPlace);
  const taken = new Set(
    (await db.property.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map((r) => r.slug),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** Gives every listing without a slug one (used by the seed; the migration does this for existing data). */
export async function backfillPropertySlugs(db: Pick<PrismaClient, "property">) {
  const rows = await db.property.findMany({ where: { slug: null }, orderBy: { id: "asc" }, select: { id: true, title: true, locality: true } });
  for (const r of rows) await db.property.update({ where: { id: r.id }, data: { slug: await uniquePropertySlug(db, r.title, r.locality) } });
}

/** Public URL of a listing; old rows without a slug still work by id. */
export function propertyPath(p: { id: string; slug?: string | null }) {
  return `/properties/${p.slug || p.id}`;
}
