import { cache } from "react";
import { prisma } from "../db";
import type { Document, Project, Property, SiteSettings } from "../types";
import {
  mapBooking,
  mapCompany,
  mapDocument,
  mapInquiry,
  mapLead,
  mapListItem,
  mapMgmt,
  mapNews,
  mapOffice,
  mapPerm,
  mapProject,
  mapProperty,
  mapSettings,
  mapUser,
} from "./mappers";

// cache() dedupes these within one request: header, footer and page all ask for the company.
export const getCompany = cache(async () => {
  const c = await prisma.company.findFirst({ where: { id: 1 } });
  if (!c) throw new Error("Company not seeded. Run npm run db:seed");
  return mapCompany(c);
});

export const getOffices = cache(async () => {
  const rows = await prisma.office.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map(mapOffice);
});

/** Team members for the About page; `includeHidden` for the admin screen. */
export async function getManagement({ includeHidden = false } = {}) {
  const rows = await prisma.managementMember.findMany({
    where: includeHidden ? {} : { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(mapMgmt);
}

/** Active projects for admin lists and pickers; `archived: true` lists only the archived ones. */
export async function getProjects({ archived = false } = {}) {
  const rows = await prisma.project.findMany({ where: { archivedAt: archived ? { not: null } : null }, orderBy: { name: "asc" } });
  return rows.map(mapProject);
}

export const getProjectBySlug = cache(async (slug: string) => {
  const row = await prisma.project.findUnique({ where: { slug } });
  return row ? mapProject(row) : undefined;
});

export const getProjectById = cache(async (id: string) => {
  const row = await prisma.project.findUnique({ where: { id } });
  return row ? mapProject(row) : undefined;
});

export async function getProjectLists(projectId: string) {
  const rows = await prisma.projectListItem.findMany({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(mapListItem);
}

/** Active listings for admin lists; `archived: true` lists only the archived ones. */
export async function getProperties({ archived = false } = {}) {
  const rows = await prisma.property.findMany({ where: { archivedAt: archived ? { not: null } : null }, orderBy: { title: "asc" } });
  return rows.map(mapProperty);
}

export const getPropertyById = cache(async (id: string) => {
  const row = await prisma.property.findUnique({ where: { id } });
  return row ? mapProperty(row) : undefined;
});

export async function getPropertiesForProject(projectId: string) {
  const rows = await prisma.property.findMany({ where: { projectId } });
  return rows.map(mapProperty);
}

export async function getNews() {
  const rows = await prisma.news.findMany({ orderBy: { publishedOn: "desc" } });
  return rows.map(mapNews);
}

export const getNewsBySlug = cache(async (slug: string) => {
  const row = await prisma.news.findUnique({ where: { slug } });
  return row ? mapNews(row) : undefined;
});

export async function getPublicDocuments() {
  const rows = await prisma.document.findMany({
    where: { audience: "public" },
    orderBy: { issuedOn: "desc" },
  });
  return rows.map(mapDocument);
}

export async function getDocumentById(id: string) {
  const row = await prisma.document.findUnique({ where: { id } });
  return row ? mapDocument(row) : undefined;
}

export async function getDocumentRowById(id: string) {
  return prisma.document.findUnique({ where: { id } });
}

export async function getDocumentsForUser(userId: string) {
  const rows = await prisma.document.findMany({
    where: { audience: "buyer", userId },
    orderBy: { name: "asc" },
  });
  return rows.map(mapDocument);
}

export async function getUserByEmail(email: string) {
  const row = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  return row ? mapUser(row) : undefined;
}

export const getUserById = cache(async (id: string) => {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? mapUser(row) : undefined;
});

export async function getUsers() {
  const rows = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return rows.map(mapUser);
}

export async function getBookingsForUser(userId: string) {
  const rows = await prisma.booking.findMany({ where: { userId } });
  return rows.map(mapBooking);
}

export async function getAllBookings() {
  const rows = await prisma.booking.findMany();
  return rows.map(mapBooking);
}

export async function getLeads() {
  const rows = await prisma.lead.findMany({ orderBy: { name: "asc" } });
  return rows.map(mapLead);
}

export async function getInquiries() {
  const rows = await prisma.inquiry.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(mapInquiry);
}

export async function addInquiry(data: Omit<import("../types").Inquiry, "id">) {
  const row = await prisma.inquiry.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
    },
  });
  return mapInquiry(row);
}

export const getRolePermissions = cache(async () => {
  const rows = await prisma.rolePermission.findMany();
  return rows.map(mapPerm);
});

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const s = await prisma.siteSettings.findFirst({ where: { id: 1 } });
  const company = await getCompany();
  if (!s) {
    return {
      company_name: company.name,
      default_whatsapp: company.whatsapp,
      extra_cities_enabled: false,
      whatsapp_automation_enabled: false,
      payment_gateway_enabled: false,
    };
  }
  const mapped = mapSettings(s);
  mapped.company_name = company.name;
  mapped.default_whatsapp = company.whatsapp;
  return mapped;
});

export async function updateProjectProgress(projectId: string, progress_percent: number, status?: string) {
  await prisma.project.update({
    where: { id: projectId },
    data: {
      progressPercent: progress_percent,
      ...(status ? { status } : {}),
    },
  });
}

export async function updatePropertyStatus(propertyId: string, status: Property["status"]) {
  await prisma.property.update({
    where: { id: propertyId },
    data: { status },
  });
}

export async function createSessionRecord(userId: string, tokenHash: string, expiresAt: Date) {
  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });
}

export async function findSessionByToken(tokenHash: string) {
  return prisma.session.findUnique({ where: { tokenHash } });
}

export async function deleteSessionByToken(tokenHash: string) {
  await prisma.session.deleteMany({ where: { tokenHash } });
}

export async function deleteExpiredSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
}

export async function deleteSessionsForUser(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

/** Drops undefined keys so partial updates never overwrite columns the caller did not send. */
function definedOnly<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export async function upsertProject(data: Partial<Project> & { id?: string; slug: string; name: string }) {
  const fields = {
    slug: data.slug,
    name: data.name,
    city: data.city,
    location: data.location,
    developer: data.developer,
    description: data.description,
    status: data.status,
    expectedCompletion: data.expected_completion,
    contactPerson: data.contact_person,
    contactPhone: data.contact_phone,
    progressPercent: data.progress_percent,
    type: data.type,
    imagePath: data.image_path,
    masterPlan: data.master_plan,
    sitePlan: data.site_plan,
    pricingLabel: data.pricing_label,
    paymentPlan: data.payment_plan,
    availableUnits: data.available_units,
    // Empty string from a form clears the SEO override.
    seoTitle: data.seo_title === undefined ? undefined : data.seo_title || null,
    seoDescription: data.seo_description === undefined ? undefined : data.seo_description || null,
    division: data.division,
    category: data.category,
    featured: data.featured,
    published: data.published,
  };
  if (data.id) {
    // An archived project stays hidden until it is restored, whatever the edit form says.
    const archived = (await prisma.project.findUnique({ where: { id: data.id }, select: { archivedAt: true } }))?.archivedAt;
    const safe = archived ? { ...fields, published: false, featured: false } : fields;
    await prisma.project.update({ where: { id: data.id }, data: definedOnly(safe) });
    return data.id;
  }
  const row = await prisma.project.create({
    data: {
      ...fields,
      city: fields.city ?? "Lahore",
      location: fields.location ?? "",
      developer: fields.developer ?? "Friends Associates",
      description: fields.description ?? "",
      status: fields.status ?? "Planning",
      expectedCompletion: fields.expectedCompletion ?? "TBC",
      contactPerson: fields.contactPerson ?? "Sales",
      contactPhone: fields.contactPhone ?? "",
      progressPercent: fields.progressPercent ?? 0,
      type: fields.type ?? "Residential",
      imagePath: fields.imagePath ?? "",
      masterPlan: fields.masterPlan ?? "",
      sitePlan: fields.sitePlan ?? "",
      pricingLabel: fields.pricingLabel ?? "",
      paymentPlan: fields.paymentPlan ?? "",
      availableUnits: fields.availableUnits ?? 0,
      seoTitle: fields.seoTitle ?? null,
      seoDescription: fields.seoDescription ?? null,
      division: fields.division ?? "construction",
      category: fields.category ?? "residential",
      featured: fields.featured ?? false,
      published: fields.published ?? true,
    },
  });
  return row.id;
}

export async function getProjectBySlugExcluding(slug: string, excludeId?: string) {
  return prisma.project.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) } });
}

export async function upsertProperty(data: Partial<Property> & { id?: string; project_id: string | null; title: string }) {
  const fields = {
    projectId: data.project_id,
    listingType: data.listing_type,
    locality: data.locality,
    areaMarla: data.area_marla,
    description: data.description,
    published: data.published,
    title: data.title,
    type: data.type,
    city: data.city,
    size: data.size,
    pricePkr: data.price_pkr,
    status: data.status,
    imagePath: data.image_path,
  };
  if (data.id) {
    // An archived unit stays hidden until it is restored, whatever the edit form says.
    const archived = (await prisma.property.findUnique({ where: { id: data.id }, select: { archivedAt: true } }))?.archivedAt;
    await prisma.property.update({ where: { id: data.id }, data: definedOnly(archived ? { ...fields, published: false } : fields) });
    return data.id;
  }
  const row = await prisma.property.create({
    data: {
      ...fields,
      type: fields.type ?? "Plot",
      city: fields.city ?? "Lahore",
      size: fields.size ?? "5 Marla",
      pricePkr: fields.pricePkr ?? 0,
      status: fields.status ?? "Available",
      imagePath: fields.imagePath ?? "",
      listingType: fields.listingType ?? "sale",
      locality: fields.locality ?? "",
      description: fields.description ?? "",
      published: fields.published ?? true,
    },
  });
  return row.id;
}

export async function attachDocumentFile(
  docId: string,
  storagePath: string,
  fileName: string,
) {
  await prisma.document.update({
    where: { id: docId },
    data: { storagePath, fileName },
  });
}

export async function createDocumentRecord(input: {
  audience: Document["audience"];
  userId?: string | null;
  projectId?: string | null;
  name: string;
  category: string;
  issuedOn: string;
  fileName: string;
  storagePath: string;
}) {
  return prisma.document.create({
    data: {
      audience: input.audience,
      userId: input.userId ?? null,
      projectId: input.projectId ?? null,
      name: input.name,
      category: input.category,
      issuedOn: input.issuedOn,
      fileName: input.fileName,
      storagePath: input.storagePath,
      version: input.audience === "buyer" ? "v1.0" : null,
      status: input.audience === "buyer" ? "Issued" : null,
    },
  });
}

// ---------------------------------------------------------------------------
// Joined reads. One query each instead of a lookup per row (N+1).
// ---------------------------------------------------------------------------

const projectSummary = { select: { id: true, name: true, slug: true, progressPercent: true, status: true } } as const;

export type BookingWithRelations = ReturnType<typeof mapBooking> & {
  property: { id: string; title: string; type: string; size: string };
  project: { id: string; name: string; slug: string; progress_percent: number; status: string };
};

export async function getBookingsForUserDetailed(userId: string): Promise<BookingWithRelations[]> {
  const rows = await prisma.booking.findMany({
    where: { userId },
    orderBy: { bookedOn: "desc" },
    include: {
      property: { select: { id: true, title: true, type: true, size: true } },
      project: projectSummary,
    },
  });
  return rows.map((b) => ({
    ...mapBooking(b),
    property: b.property,
    project: {
      id: b.project.id,
      name: b.project.name,
      slug: b.project.slug,
      progress_percent: b.project.progressPercent,
      status: b.project.status,
    },
  }));
}

export type PropertyFilter = {
  status?: string;
  city?: string;
  type?: string;
  listingType?: string;
  locality?: string;
  minPrice?: number;
  maxPrice?: number;
  minMarla?: number;
  maxMarla?: number;
  projectId?: string;
  /** Public pages pass true; admin lists see unpublished rows too. */
  publishedOnly?: boolean;
};

export async function getPropertiesWithProject(filter: PropertyFilter = {}, take?: number) {
  const rows = await prisma.property.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.city ? { city: filter.city } : {}),
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.listingType ? { listingType: filter.listingType } : {}),
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
      ...(filter.locality ? { locality: { contains: filter.locality } } : {}),
      ...(filter.publishedOnly ? { published: true } : {}),
      archivedAt: null,
      ...(filter.minPrice !== undefined || filter.maxPrice !== undefined
        ? { pricePkr: { ...(filter.minPrice !== undefined ? { gte: filter.minPrice } : {}), ...(filter.maxPrice !== undefined ? { lt: filter.maxPrice } : {}) } }
        : {}),
      ...(filter.minMarla !== undefined || filter.maxMarla !== undefined
        ? { areaMarla: { ...(filter.minMarla !== undefined ? { gte: filter.minMarla } : {}), ...(filter.maxMarla !== undefined ? { lte: filter.maxMarla } : {}) } }
        : {}),
    },
    orderBy: [{ status: "asc" }, { title: "asc" }],
    take,
    include: { project: { select: { name: true, slug: true } } },
  });
  return rows.map((p) => ({ ...mapProperty(p), project_name: p.project?.name ?? null, project_slug: p.project?.slug ?? null }));
}

export async function getPropertyLocalities() {
  const rows = await prisma.property.findMany({
    where: { published: true, locality: { not: "" } },
    distinct: ["locality"],
    select: { locality: true },
    orderBy: { locality: "asc" },
  });
  return rows.map((r) => r.locality);
}

export type ProjectFilter = { division?: string; category?: string; city?: string; status?: string; publishedOnly?: boolean };

export async function getProjectsFiltered(filter: ProjectFilter = {}) {
  const rows = await prisma.project.findMany({
    where: {
      ...(filter.division ? { division: filter.division } : {}),
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.city ? { city: filter.city } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.publishedOnly ? { published: true } : {}),
      archivedAt: null,
    },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    include: { stages: { orderBy: { sortOrder: "asc" } } },
  });
  return rows.map((p) => ({ ...mapProject(p), stages: p.stages.map(mapStage) }));
}

export type ProjectStageRow = { id: string; name: string; percent: number; target_date: string | null; note: string; sort_order: number; updated_at: string };

function mapStage(s: { id: string; name: string; percent: number; targetDate: string | null; note: string; sortOrder: number; updatedAt: Date }): ProjectStageRow {
  return { id: s.id, name: s.name, percent: s.percent, target_date: s.targetDate, note: s.note, sort_order: s.sortOrder, updated_at: s.updatedAt.toISOString() };
}

export async function getProjectStages(projectId: string) {
  const rows = await prisma.projectStage.findMany({ where: { projectId }, orderBy: { sortOrder: "asc" } });
  return rows.map(mapStage);
}

export async function getProjectCategoryCounts(division?: string) {
  const rows = await prisma.project.groupBy({
    by: ["category"],
    where: { published: true, ...(division ? { division } : {}) },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.category, r._count._all])) as Record<string, number>;
}

export async function getFeaturedProjects(take = 3) {
  const rows = await prisma.project.findMany({
    where: { published: true },
    orderBy: [{ featured: "desc" }, { progressPercent: "desc" }],
    take,
  });
  return rows.map(mapProject);
}

export async function getLatestNews(take = 3) {
  const rows = await prisma.news.findMany({ orderBy: { publishedOn: "desc" }, take });
  return rows.map(mapNews);
}

export async function getSiteStats() {
  const [projects, availableUnits, cities] = await Promise.all([
    prisma.project.count({ where: { archivedAt: null } }),
    prisma.property.count({ where: { status: "Available", archivedAt: null } }),
    prisma.office.count(),
  ]);
  return { projects, availableUnits, cities };
}

export async function getAdminCounts() {
  const [customers, projects, propertyGroups, inquiries, leads, outstanding] = await Promise.all([
    prisma.user.count({ where: { role: "buyer" } }),
    prisma.project.count({ where: { archivedAt: null } }),
    prisma.property.groupBy({ by: ["status"], where: { archivedAt: null }, _count: { _all: true } }),
    prisma.inquiry.count(),
    prisma.lead.count(),
    // Cancelled bookings keep their last figures as history; they are not money still owed.
    prisma.booking.aggregate({ where: { status: { not: "Cancelled" } }, _sum: { outstandingPkr: true } }),
  ]);
  const byStatus = Object.fromEntries(propertyGroups.map((g) => [g.status, g._count._all]));
  return {
    customers,
    projects,
    available: byStatus.Available ?? 0,
    booked: byStatus.Booked ?? 0,
    sold: byStatus.Sold ?? 0,
    inquiries,
    leads,
    outstandingPkr: outstanding._sum.outstandingPkr ?? 0,
  };
}

export * from "./content";
export * from "./audit";
export * from "./customers";
export * from "./bookings";
export * from "./login-attempts";
export * from "./staff";
export * from "./role-permissions";
export * from "./stages";
export * from "./site";
export * from "./services";
export * from "./lifecycle";
export * from "./dashboard";
export * from "./notifications";
export * from "./pm-desk";
export * from "./inventory";
export * from "./leads";
export * from "./investments";
export * from "./documents";
