import { prisma } from "../db";

/* ---------- Projects directory ---------- */

export type ProjectCard = {
  id: string;
  slug: string;
  name: string;
  division: string;
  category: string;
  status: string;
  published: boolean;
  featured: boolean;
  progress: number;
  units: { total: number; available: number; booked: number; sold: number };
};

/** Projects for Admin → Projects. Progress is the average of published stages (as buyers see it). */
export async function getProjectDirectory({ archived = false } = {}): Promise<ProjectCard[]> {
  const rows = await prisma.project.findMany({
    where: { archivedAt: archived ? { not: null } : null },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      division: true,
      category: true,
      status: true,
      published: true,
      featured: true,
      progressPercent: true,
      stages: { select: { percent: true } },
      properties: { where: { archivedAt: null }, select: { status: true } },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    division: p.division,
    category: p.category,
    status: p.status,
    published: p.published,
    featured: p.featured,
    progress: p.stages.length ? Math.round(p.stages.reduce((s, x) => s + x.percent, 0) / p.stages.length) : p.progressPercent,
    units: {
      total: p.properties.length,
      available: p.properties.filter((u) => u.status === "Available").length,
      booked: p.properties.filter((u) => u.status === "Booked").length,
      sold: p.properties.filter((u) => u.status === "Sold").length,
    },
  }));
}

export async function countArchivedProjects() {
  return prisma.project.count({ where: { archivedAt: { not: null } } });
}

/**
 * Duplicate a project (PROJECT_SPEC §43): same details and stage names, progress reset to 0, unpublished
 * and not featured, with a free "-copy" slug. Units, bookings, documents and photos are not copied.
 */
export async function duplicateProject(id: string) {
  const p = await prisma.project.findUnique({ where: { id }, include: { stages: { orderBy: { sortOrder: "asc" } }, listItems: true } });
  if (!p) return null;
  let slug = `${p.slug}-copy`;
  for (let i = 2; await prisma.project.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${p.slug}-copy-${i}`;
  return prisma.project.create({
    data: {
      slug,
      name: `${p.name} (copy)`,
      city: p.city,
      location: p.location,
      developer: p.developer,
      description: p.description,
      status: "Planning",
      expectedCompletion: p.expectedCompletion,
      contactPerson: p.contactPerson,
      contactPhone: p.contactPhone,
      progressPercent: 0,
      type: p.type,
      imagePath: "",
      masterPlan: p.masterPlan,
      sitePlan: p.sitePlan,
      pricingLabel: p.pricingLabel,
      paymentPlan: p.paymentPlan,
      availableUnits: 0,
      seoTitle: null,
      seoDescription: null,
      division: p.division,
      category: p.category,
      featured: false,
      published: false,
      stages: { create: p.stages.map((s) => ({ name: s.name, percent: 0, sortOrder: s.sortOrder, targetDate: null, note: "" })) },
      listItems: { create: p.listItems.map((l) => ({ label: l.label, sortOrder: l.sortOrder, kind: l.kind })) },
    },
  });
}

/* ---------- Properties directory ---------- */

export type PropertyRow = {
  id: string;
  title: string;
  type: string;
  listingType: string;
  city: string;
  locality: string;
  pricePkr: number;
  status: string;
  published: boolean;
  project: { id: string; name: string } | null;
  buyer: { id: string; name: string } | null;
};

export async function getPropertyDirectory({ archived = false } = {}): Promise<PropertyRow[]> {
  const rows = await prisma.property.findMany({
    where: { archivedAt: archived ? { not: null } : null },
    orderBy: [{ title: "asc" }],
    select: {
      id: true,
      title: true,
      type: true,
      listingType: true,
      city: true,
      locality: true,
      pricePkr: true,
      status: true,
      published: true,
      project: { select: { id: true, name: true } },
      bookings: { where: { status: { not: "Cancelled" } }, take: 1, select: { user: { select: { id: true, name: true } } } },
    },
  });
  return rows.map(({ bookings, ...p }) => ({ ...p, buyer: bookings[0]?.user ?? null }));
}

export async function countArchivedProperties() {
  return prisma.property.count({ where: { archivedAt: { not: null } } });
}

/** Units that have an active booking: their status is driven by the booking, not edited by hand. */
export async function propertiesWithActiveBooking(ids: string[]) {
  const rows = await prisma.booking.findMany({ where: { propertyId: { in: ids }, status: { not: "Cancelled" } }, select: { propertyId: true } });
  return new Set(rows.map((r) => r.propertyId));
}
