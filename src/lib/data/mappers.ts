import type {
  Booking,
  Company,
  Document,
  Inquiry,
  Lead,
  ManagementMember,
  NewsItem,
  Office,
  Project,
  ProjectListItem,
  Property,
  RolePermission,
  SiteSettings,
  User,
  UserRole,
} from "../types";
import type {
  Booking as DbBooking,
  Company as DbCompany,
  Document as DbDocument,
  Inquiry as DbInquiry,
  Lead as DbLead,
  ManagementMember as DbMgmt,
  News as DbNews,
  Office as DbOffice,
  Project as DbProject,
  ProjectListItem as DbListItem,
  Property as DbProperty,
  RolePermission as DbPerm,
  SiteSettings as DbSettings,
  User as DbUser,
} from "@prisma/client";

export function mapCompany(c: DbCompany): Company {
  return {
    id: c.id,
    name: c.name,
    tagline: c.tagline,
    website: c.website,
    email: c.email,
    whatsapp: c.whatsapp,
    mission: c.mission,
    vision: c.vision,
    experience: c.experience,
    document_download_fee_pkr: c.documentDownloadFeePkr,
  };
}

export function mapOffice(o: DbOffice): Office {
  return {
    id: o.id,
    city: o.city as Office["city"],
    address: o.address,
    phone: o.phone,
    sort_order: o.sortOrder,
  };
}

export function mapMgmt(m: DbMgmt): ManagementMember {
  return { id: m.id, name: m.name, title: m.title, sort_order: m.sortOrder };
}

export function mapProject(p: DbProject): Project {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    city: p.city as Project["city"],
    location: p.location,
    developer: p.developer,
    description: p.description,
    status: p.status,
    expected_completion: p.expectedCompletion,
    contact_person: p.contactPerson,
    contact_phone: p.contactPhone,
    progress_percent: p.progressPercent,
    type: p.type as Project["type"],
    image_path: p.imagePath,
    master_plan: p.masterPlan,
    site_plan: p.sitePlan,
    pricing_label: p.pricingLabel,
    payment_plan: p.paymentPlan,
    available_units: p.availableUnits,
    seo_title: p.seoTitle ?? undefined,
    seo_description: p.seoDescription ?? undefined,
    division: p.division as Project["division"],
    category: p.category as Project["category"],
    featured: p.featured,
    published: p.published,
  };
}

export function mapListItem(l: DbListItem): ProjectListItem {
  return { id: l.id, project_id: l.projectId, label: l.label, sort_order: l.sortOrder };
}

export function mapProperty(p: DbProperty): Property {
  return {
    id: p.id,
    project_id: p.projectId,
    title: p.title,
    type: p.type as Property["type"],
    city: p.city as Property["city"],
    size: p.size,
    price_pkr: p.pricePkr,
    status: p.status as Property["status"],
    image_path: p.imagePath,
    listing_type: p.listingType as Property["listing_type"],
    locality: p.locality,
    area_marla: p.areaMarla,
    description: p.description,
    published: p.published,
  };
}

export function mapUser(u: DbUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    password_hash: u.passwordHash,
    role: u.role as UserRole,
    city: u.city,
    phone: u.phone,
    cnic: u.cnic,
    document_download_paid_at: u.documentDownloadPaidAt?.toISOString() ?? null,
    active: u.active,
  };
}

export function mapBooking(b: DbBooking): Booking {
  return {
    id: b.id,
    user_id: b.userId,
    property_id: b.propertyId,
    project_id: b.projectId,
    status: b.status,
    booked_on: b.bookedOn,
    total_price_pkr: b.totalPricePkr,
    paid_pkr: b.paidPkr,
    outstanding_pkr: b.outstandingPkr,
    payments_received: b.paymentsReceived,
    payments_remaining: b.paymentsRemaining,
    next_payment_date: b.nextPaymentDate,
    next_payment_amount_pkr: b.nextPaymentAmountPkr,
  };
}

export function mapDocument(d: DbDocument): Document {
  return {
    id: d.id,
    audience: d.audience as Document["audience"],
    user_id: d.userId,
    project_id: d.projectId,
    name: d.name,
    category: d.category,
    issued_on: d.issuedOn,
    version: d.version,
    status: d.status as Document["status"],
    file_name: d.fileName,
    storage_path: d.storagePath,
  };
}

export function mapNews(n: DbNews): NewsItem {
  return {
    id: n.id,
    title: n.title,
    slug: n.slug,
    published_on: n.publishedOn,
    excerpt: n.excerpt,
    body: n.body,
    seo_title: n.seoTitle ?? undefined,
    seo_description: n.seoDescription ?? undefined,
  };
}

export function mapLead(l: DbLead): Lead {
  return {
    id: l.id,
    name: l.name,
    phone: l.phone,
    city: l.city,
    interest: l.interest,
    status: l.status as Lead["status"],
  };
}

export function mapInquiry(i: DbInquiry): Inquiry {
  return {
    id: i.id,
    name: i.name,
    email: i.email,
    phone: i.phone,
    message: i.message,
    created_at: i.createdAt.toISOString(),
  };
}

export function mapPerm(p: DbPerm): RolePermission {
  return {
    role: p.role as RolePermission["role"],
    resource: p.resource as RolePermission["resource"],
    right: p.right as RolePermission["right"],
  };
}

export function mapSettings(s: DbSettings): SiteSettings {
  return {
    company_name: "Friends Associates",
    default_whatsapp: "+92 300 3279500",
    extra_cities_enabled: s.extraCitiesEnabled,
    whatsapp_automation_enabled: s.whatsappAutomationEnabled,
    payment_gateway_enabled: s.paymentGatewayEnabled,
  };
}
