import type { Division, ListingType, ProjectCategory } from "./catalog";

/** One of CITIES, or any city typed in by staff (see cleanCity). */
export type City = string;

export type UserRole = "buyer" | "sales" | "project_manager" | "admin";

export type PermissionRole = UserRole | "visitor";

export type AppResource =
  | "projects"
  | "properties"
  | "documents"
  | "payments"
  | "users"
  | "leads"
  | "bookings"
  | "progress"
  | "chatbot"
  | "reports";

export type AppRight = "view" | "add" | "update" | "delete";

export type ProjectType = "Residential" | "Commercial" | "Mixed-use";

export type PropertyType = (typeof import("./catalog").PROPERTY_TYPES)[number];

export type PropertyStatus = "Available" | "Booked" | "Sold";

export type BuyerDocumentStatus = "Issued" | "Pending" | "Approved";

export type LeadStatus = "New" | "Follow-up" | "Qualified" | "Closed";

export type DocumentAudience = "public" | "buyer";

export interface Company {
  id: number;
  name: string;
  tagline: string;
  website: string;
  email: string;
  whatsapp: string;
  mission: string;
  vision: string;
  experience: string;
  document_download_fee_pkr: number;
}

export interface Office {
  id: string;
  city: City;
  address: string;
  phone: string;
  sort_order: number;
}

export interface ManagementMember {
  id: string;
  name: string;
  title: string;
  sort_order: number;
  bio: string;
  experience: string;
  photo_path: string;
  active: boolean;
}

export interface ProjectListItem {
  id: string;
  project_id: string;
  label: string;
  sort_order: number;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  city: City;
  location: string;
  developer: string;
  description: string;
  status: string;
  expected_completion: string;
  contact_person: string;
  contact_phone: string;
  progress_percent: number;
  type: ProjectType;
  image_path: string;
  /** Extra photos after the cover, in order. */
  gallery: string[];
  /** Google Maps link, address or coordinates ("" = no map). */
  map_link: string;
  video_url: string;
  master_plan: string;
  site_plan: string;
  pricing_label: string;
  payment_plan: string;
  available_units: number;
  seo_title?: string;
  seo_description?: string;
  division: Division;
  category: ProjectCategory;
  featured: boolean;
  published: boolean;
  /** ISO time when archived; null while active. */
  archived_at: string | null;
}

export interface Property {
  id: string;
  /** Web address part: /properties/<slug>. Null only on rows from before slugs. */
  slug: string | null;
  /** Null for standalone resale/rental listings. */
  project_id: string | null;
  title: string;
  type: PropertyType;
  city: City;
  size: string;
  price_pkr: number;
  status: PropertyStatus;
  image_path: string;
  /** Extra photos after the cover, in order. */
  gallery: string[];
  /** Google Maps link, address or coordinates ("" = no map). */
  map_link: string;
  video_url: string;
  listing_type: ListingType;
  locality: string;
  area_marla: number | null;
  description: string;
  published: boolean;
  /** ISO time when archived; null while active. */
  archived_at: string | null;
}

export interface User {
  id: string;
  name: string;
  /** "" when the customer has no email (they sign in with their user ID). */
  email: string;
  /** Customer user ID for sign-in; "" when they sign in with their email. */
  username: string;
  password_hash: string;
  role: UserRole;
  city: string;
  phone: string;
  cnic: string;
  document_download_paid_at: string | null;
  active: boolean;
  /** Customers: the office allowed them to change their own password (staff always can). */
  can_change_password: boolean;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
}

export interface RolePermission {
  role: PermissionRole;
  resource: AppResource;
  right: AppRight;
}

export interface Booking {
  id: string;
  user_id: string;
  property_id: string;
  /** Null for a standalone listing. */
  project_id: string | null;
  status: string;
  booked_on: string;
  total_price_pkr: number;
  paid_pkr: number;
  outstanding_pkr: number;
  payments_received: number;
  payments_remaining: number;
  next_payment_date: string;
  next_payment_amount_pkr: number;
}

export interface Document {
  id: string;
  audience: DocumentAudience;
  user_id: string | null;
  project_id: string | null;
  name: string;
  category: string;
  issued_on: string;
  version: string | null;
  status: BuyerDocumentStatus | null;
  file_name: string;
  storage_path?: string | null;
  /** Office note shown with the file ("" when none). */
  note: string;
  /** Not shown to the customer (or on the website) until the office shows it. */
  hidden: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  slug: string;
  published_on: string;
  excerpt: string;
  body: string;
  seo_title?: string;
  seo_description?: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  city: string;
  interest: string;
  status: LeadStatus;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  created_at: string;
}

export interface FeatureFlags {
  extra_cities_enabled: boolean;
  whatsapp_automation_enabled: boolean;
  payment_gateway_enabled: boolean;
}

export interface SiteSettings extends FeatureFlags {
  company_name: string;
  default_whatsapp: string;
}
