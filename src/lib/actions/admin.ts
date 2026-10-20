"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  upsertProject,
  upsertProperty,
  getProjectBySlugExcluding,
  getProjectById,
  getPropertyById,
  writeAuditLog,
} from "@/lib/data";
import { requireStaff } from "@/lib/permissions";
import type { City, ProjectType, PropertyStatus, PropertyType } from "@/lib/types";
import {
  DIVISIONS,
  LISTING_TYPES,
  PROJECT_CATEGORIES,
  isKey,
  parseMarla,
  type Division,
  type ListingType,
  type ProjectCategory,
} from "@/lib/catalog";
import { ImageError, optionalImage, removeImage, saveImage } from "@/lib/images";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Returns undefined for blank or non-numeric input so callers can reject it. */
function nonNegativeInt(formData: FormData, key: string): number | undefined {
  const raw = text(formData, key);
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
}

export async function saveProjectAction(formData: FormData) {
  const id = text(formData, "id") || undefined;
  const { user: actor } = await requireStaff("projects", id ? "update" : "add");
  const slug = text(formData, "slug").toLowerCase();
  const name = text(formData, "name");
  const back = (code: string) => redirect(`${id ? `/admin/projects/${id}` : "/admin/projects/new"}?error=${code}`);
  if (!slug || !name) back("required");
  if (!SLUG_RE.test(slug)) back("slug");
  if (await getProjectBySlugExcluding(slug, id)) back("slug-taken");
  const division = text(formData, "division");
  const category = text(formData, "category");
  if (!isKey(DIVISIONS, division) || !isKey(PROJECT_CATEGORIES, category)) back("category");

  const progress = nonNegativeInt(formData, "progress_percent");
  const availableUnits = nonNegativeInt(formData, "available_units");
  const before = id ? await getProjectById(id) : undefined;

  let imagePath: string | undefined;
  const image = optionalImage(formData);
  if (image) {
    try {
      imagePath = await saveImage(image, "projects");
    } catch (e) {
      if (e instanceof ImageError) back(e.code);
      throw e;
    }
  }

  const input = {
    slug,
    name,
    division: division as Division,
    category: category as ProjectCategory,
    city: (text(formData, "city") || "Rahim Yar Khan") as City,
    location: text(formData, "location"),
    description: text(formData, "description"),
    status: text(formData, "status"),
    expected_completion: text(formData, "expected_completion"),
    contact_person: text(formData, "contact_person"),
    contact_phone: text(formData, "contact_phone"),
    progress_percent: progress === undefined ? undefined : Math.min(100, progress),
    available_units: availableUnits,
    type: (text(formData, "type") || "Residential") as ProjectType,
    pricing_label: text(formData, "pricing_label"),
    payment_plan: text(formData, "payment_plan"),
    seo_title: text(formData, "seo_title"),
    seo_description: text(formData, "seo_description"),
    featured: formData.get("featured") === "on",
    published: formData.get("published") === "on",
    ...(imagePath ? { image_path: imagePath } : {}),
  };
  const savedId = await upsertProject({ id, ...input });
  // Remove the replaced upload only after the new one is saved.
  if (imagePath && before) await removeImage(before.image_path);
  await writeAuditLog({
    userId: actor.id,
    action: id ? "update" : "create",
    module: "projects",
    recordId: savedId,
    oldValue: before,
    newValue: input,
  });

  revalidatePath("/", "layout");
  redirect("/admin/projects?saved=1");
}

export async function savePropertyAction(formData: FormData) {
  const id = text(formData, "id") || undefined;
  const { user: actor } = await requireStaff("properties", id ? "update" : "add");
  const title = text(formData, "title");
  const projectId = text(formData, "project_id") || null;
  const back = (code: string) => redirect(`${id ? `/admin/properties/${id}` : "/admin/properties/new"}?error=${code}`);
  if (!title) back("required");
  const price = nonNegativeInt(formData, "price_pkr");
  if (price === undefined) back("price");
  const listingType = text(formData, "listing_type");
  if (!isKey(LISTING_TYPES, listingType)) back("required");
  const size = text(formData, "size");
  const marlaRaw = text(formData, "area_marla");
  const areaMarla = marlaRaw === "" ? parseMarla(size) : Number(marlaRaw);
  if (areaMarla !== null && (!Number.isFinite(areaMarla) || areaMarla < 0)) back("number");

  const before = id ? await getPropertyById(id) : undefined;
  let imagePath: string | undefined;
  const image = optionalImage(formData);
  if (image) {
    try {
      imagePath = await saveImage(image, "properties");
    } catch (e) {
      if (e instanceof ImageError) back(e.code);
      throw e;
    }
  }

  const input = {
    project_id: projectId,
    title,
    listing_type: listingType as ListingType,
    city: (text(formData, "city") || "Rahim Yar Khan") as City,
    locality: text(formData, "locality"),
    type: (text(formData, "type") || "Plot") as PropertyType,
    size,
    area_marla: areaMarla,
    price_pkr: price,
    status: (text(formData, "status") || "Available") as PropertyStatus,
    description: text(formData, "description"),
    published: formData.get("published") === "on",
    ...(imagePath ? { image_path: imagePath } : {}),
  };
  const savedId = await upsertProperty({ id, ...input });
  if (imagePath && before) await removeImage(before.image_path);
  await writeAuditLog({
    userId: actor.id,
    action: id ? "update" : "create",
    module: "properties",
    recordId: savedId,
    oldValue: before,
    newValue: input,
  });

  revalidatePath("/", "layout");
  redirect("/admin/properties?saved=1");
}
