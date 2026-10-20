/**
 * Business catalogue from the client brief (FARYK- Chatbot questions.txt, 06-10-2026).
 * Single source for divisions, project categories, services, listing and lead vocabularies.
 * Used by public pages, filters, admin forms, server-side validation and (later) the chatbot flow.
 */

export const DIVISIONS = [
  {
    key: "architecture",
    label: "Architecture",
    path: "/architecture",
    summary: "Planning, architectural and structural drawings, estimation and approvals for every kind of building.",
  },
  {
    key: "construction",
    label: "Construction",
    path: "/construction",
    summary: "Grey structure to turnkey construction, renovation, waterproofing and construction chemicals.",
  },
] as const;
export type Division = (typeof DIVISIONS)[number]["key"];

export const PROJECT_CATEGORIES = [
  { key: "residential", label: "Residential", icon: "🏠", examples: "Homes, apartments, private farm houses" },
  { key: "commercial", label: "Commercial", icon: "🏢", examples: "Petrol pumps, shops, plazas, weighbridges, commercial schemes" },
  { key: "industrial", label: "Industrial", icon: "🏭", examples: "Factories, flour & oil mills, cotton/textile, LPG plants, timber processing" },
  { key: "hospitality", label: "Hospitality", icon: "🏨", examples: "Hotels and restaurants" },
  { key: "healthcare", label: "Hospitals & clinics", icon: "🏥", examples: "Hospitals and private clinics" },
  { key: "educational", label: "Educational", icon: "🏫", examples: "Schools and colleges" },
  { key: "recreational", label: "Recreational", icon: "🌳", examples: "Parks, zoos and leisure spaces" },
  { key: "consultancy", label: "Consultancy", icon: "📋", examples: "Construction, design, NOC/approvals and investment consultancy" },
] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number]["key"];

export type ServiceGroup = { title: string; icon: string; items: string[] };

/**
 * Original services per division, worded as in the client brief. Since the 20261016 services migration these
 * live in the Service table (Admin → Website content → Services); this list is only the reference they were copied from.
 */
export const SERVICES: Record<Division, ServiceGroup[]> = {
  architecture: [
    {
      title: "Architecture & Engineering",
      icon: "📐",
      items: ["House planning", "2D floor plans", "3D elevation", "Architectural drawings", "Structural drawings", "Working drawings", "Site planning"],
    },
    { title: "Survey & Estimation", icon: "💰", items: ["Soil investigation", "Cost estimation & BOQ", "Map printing"] },
    {
      title: "NOC & Approval Consultancy",
      icon: "📑",
      items: ["Petrol pump", "LPG plant", "Flour mill", "Oil mill", "Cotton factory / textile", "Timber processing", "Commercial projects", "Industrial projects"],
    },
    {
      title: "Industrial Project Planning",
      icon: "🏭",
      items: ["Factories & sheds", "Warehouse / godown", "Cold storage", "Workshops", "Agricultural / farm buildings"],
    },
  ],
  construction: [
    { title: "Construction", icon: "🏗️", items: ["Grey structure", "Complete (turnkey) construction", "Renovation", "Reconstruction", "Consultation"] },
    {
      title: "Waterproofing",
      icon: "💧",
      items: ["Roof waterproofing", "Water tank waterproofing", "Basement waterproofing", "Bathroom waterproofing", "Foundation / DPC", "Wall dampness treatment"],
    },
    {
      title: "Construction Chemicals",
      icon: "🧪",
      items: ["DPC & damp proofing", "Waterproofing chemicals", "Concrete treatment", "Water stopper", "Termite protection", "Joint treatment"],
    },
  ],
};

export const LISTING_TYPES = [
  { key: "sale", label: "For sale", tab: "Buy" },
  { key: "rent", label: "For rent", tab: "Rent" },
] as const;
export type ListingType = (typeof LISTING_TYPES)[number]["key"];

export const PROPERTY_TYPES = ["House", "Apartment", "Plot", "Shop", "Office", "Plaza", "Farm house", "Commercial"] as const;

/** Budget bands used by property filters and forms (whole PKR; rent bands are per month). */
export const BUDGET_BANDS: Record<ListingType, { key: string; label: string; min?: number; max?: number }[]> = {
  sale: [
    { key: "u50l", label: "Under 50 lakh", max: 5_000_000 },
    { key: "50l-1cr", label: "50 lakh – 1 crore", min: 5_000_000, max: 10_000_000 },
    { key: "1-3cr", label: "1 – 3 crore", min: 10_000_000, max: 30_000_000 },
    { key: "3cr+", label: "Above 3 crore", min: 30_000_000 },
  ],
  rent: [
    { key: "u50k", label: "Under 50,000 / month", max: 50_000 },
    { key: "50-100k", label: "50,000 – 1 lakh / month", min: 50_000, max: 100_000 },
    { key: "100k+", label: "Above 1 lakh / month", min: 100_000 },
  ],
};

export const SIZE_BANDS = [
  { key: "u5", label: "Up to 5 Marla", max: 5 },
  { key: "5-10", label: "5 – 10 Marla", min: 5, max: 10 },
  { key: "10-20", label: "10 Marla – 1 Kanal", min: 10, max: 20 },
  { key: "20+", label: "Above 1 Kanal", min: 20 },
] as const;

export const LEAD_STATUSES = [
  { key: "new", label: "New lead" },
  { key: "contacted", label: "Contacted" },
  { key: "requirement_received", label: "Requirement received" },
  { key: "quotation_pending", label: "Quotation pending" },
  { key: "quotation_sent", label: "Quotation sent" },
  { key: "follow_up", label: "Follow-up" },
  { key: "converted", label: "Converted" },
  { key: "closed", label: "Closed" },
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number]["key"];

/** Payment methods from PROJECT_SPEC §24. */
export const PAYMENT_METHODS = ["Bank Transfer", "Cash", "Cheque", "Online Payment", "Other"] as const;

export const LEAD_SOURCES = [
  { key: "contact", label: "Contact form" },
  { key: "callback", label: "Callback request" },
  { key: "sell", label: "Sell my property" },
  { key: "investment", label: "Investor interest" },
  { key: "chatbot", label: "Chatbot" },
  { key: "manual", label: "Added by staff" },
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number]["key"];

export const INVESTMENT_TYPES = [
  { key: "plaza", label: "Commercial plaza" },
  { key: "residential", label: "Residential homes" },
  { key: "shops", label: "Shops" },
  { key: "market", label: "Market" },
  { key: "other", label: "Other development" },
] as const;

export const INVESTMENT_STATUSES = [
  { key: "open", label: "Open for investment" },
  { key: "fully_subscribed", label: "Fully subscribed" },
  { key: "closed", label: "Closed" },
] as const;

/** Default stage names offered when a project manager adds progress stages. */
export const STAGE_SUGGESTIONS = [
  "Design completed",
  "Approvals / NOC",
  "Building layout laid",
  "Excavation & foundation",
  "Grey structure",
  "Electrical & plumbing",
  "Finishing",
  "Handover",
];

export function labelOf<T extends { key: string; label: string }>(list: readonly T[], key: string | null | undefined) {
  return list.find((x) => x.key === key)?.label ?? key ?? "";
}

export function isKey<T extends { key: string }>(list: readonly T[], value: unknown): value is T["key"] {
  return typeof value === "string" && list.some((x) => x.key === value);
}

/** "10 Marla" → 10, "1 Kanal" → 20, "2 kanal" → 40. Returns null for sq ft or unknown units. */
export function parseMarla(size: string): number | null {
  const m = size.toLowerCase().replace(/,/g, "").match(/([\d.]+)\s*(marla|kanal)/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return m[2] === "kanal" ? n * 20 : n;
}

/** Project statuses offered on the PM desk (PROJECT_SPEC §10 plus the office's own wording). */
export const PROJECT_STATUS_OPTIONS = [
  "Planning",
  "Design in progress",
  "Approvals in progress",
  "Under construction",
  "Civil works",
  "Finishing",
  "Near completion",
  "Completed",
  "Handed over",
  "On hold",
] as const;

export type StatusGroup = "construction" | "approvals" | "design" | "completed" | "other";

/** Groups free-text statuses for the PM desk tabs and chips. */
export function statusGroup(status: string): StatusGroup {
  const s = status.toLowerCase();
  if (/complete|handed/.test(s) && !/near/.test(s)) return "completed";
  if (/approv|noc/.test(s)) return "approvals";
  if (/design|plan|concept|drawing/.test(s)) return "design";
  if (/construct|civil|finish|structure|near/.test(s)) return "construction";
  return "other";
}

export const STATUS_GROUPS: { key: StatusGroup; label: string; short: string; chip: string }[] = [
  { key: "construction", label: "Under construction", short: "Under construction", chip: "bg-teal-50 text-teal-800" },
  { key: "approvals", label: "Approvals in progress", short: "Approvals", chip: "bg-amber-50 text-amber-800" },
  { key: "design", label: "Design in progress", short: "Design", chip: "bg-mist text-body" },
  { key: "completed", label: "Completed", short: "Completed", chip: "bg-emerald-50 text-emerald-800" },
  { key: "other", label: "Other", short: "Other", chip: "bg-mist text-muted" },
];

/** Plain-language state of one progress stage. */
export function stageState(percent: number): { key: "done" | "progress" | "started" | "todo"; label: string } {
  if (percent >= 100) return { key: "done", label: "Done" };
  if (percent >= 50) return { key: "progress", label: "In progress" };
  if (percent > 0) return { key: "started", label: "Started" };
  return { key: "todo", label: "Not started" };
}

/** Document types (PROJECT_SPEC §19), plus Brochure for public marketing files. */
export const DOCUMENT_TYPES = [
  "Booking Form",
  "Buyer Agreement",
  "Sale/Purchase Agreement",
  "Payment Receipt",
  "Allocation Letter",
  "Possession Document",
  "Property Plan",
  "Floor Plan",
  "Master Plan",
  "Approved Project Document",
  "Construction Report",
  "Company Document",
  "Brochure",
  "Other",
] as const;
