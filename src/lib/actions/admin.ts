"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createProjectFromName,
  upsertProject,
  upsertProperty,
  getProjectBySlugExcluding,
  getProjectById,
  getPropertyById,
  writeAuditLog,
} from "@/lib/data";
import { cleanCity } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/permissions";
import type { ProjectType, PropertyStatus, PropertyType } from "@/lib/types";
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
import { ImageError, optionalImage, readGallery, removeImage, saveImage } from "@/lib/images";

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
  // Blank keeps the old default; anything typed must look like a city name.
  const city = text(formData, "city") ? cleanCity(text(formData, "city")) : "Rahim Yar Khan";
  if (!city) back("city");

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
    city,
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
  const { user: actor, can } = await requireStaff("properties", id ? "update" : "add");
  const title = text(formData, "title");
  let projectId = text(formData, "project_id") || null;
  // A project name typed into the Project field that is not in the list yet (see Combobox createName).
  const newProject = projectId ? "" : text(formData, "new_project").replace(/\s+/g, " ").slice(0, 120);
  const back = (code: string) => redirect(`${id ? `/admin/properties/${id}` : "/admin/properties/new"}?error=${code}`);
  if (!title) back("required");
  // Blank keeps the old default; anything typed must look like a city name.
  const city = text(formData, "city") ? cleanCity(text(formData, "city")) : "Rahim Yar Khan";
  if (!city) back("city");
  const price = nonNegativeInt(formData, "price_pkr");
  if (price === undefined) back("price");
  const listingType = text(formData, "listing_type");
  if (!isKey(LISTING_TYPES, listingType)) back("required");
  const size = text(formData, "size");
  const marlaRaw = text(formData, "area_marla");
  const areaMarla = marlaRaw === "" ? parseMarla(size) : Number(marlaRaw);
  if (areaMarla !== null && (!Number.isFinite(areaMarla) || areaMarla < 0)) back("number");

  if (newProject.length === 1) back("new-project");
  if (newProject) {
    const existing = await prisma.project.findFirst({ where: { name: { equals: newProject, mode: "insensitive" } }, select: { id: true } });
    if (existing) projectId = existing.id;
    else {
      if (!can("projects", "add")) back("new-project-permission");
      projectId = await createProjectFromName(newProject, city);
      await writeAuditLog({ userId: actor.id, action: "create", module: "projects", recordId: projectId, newValue: { name: newProject, city, published: false, from: "property form" } });
    }
  }

  const before = id ? await getPropertyById(id) : undefined;
  let imagePath: string | undefined;
  let photos: Awaited<ReturnType<typeof readGallery>> | undefined;
  const image = optionalImage(formData);
  try {
    if (image) imagePath = await saveImage(image, "properties");
    photos = await readGallery(formData, "properties", before?.gallery ?? []);
  } catch (e) {
    if (imagePath) await removeImage(imagePath);
    if (e instanceof ImageError) back(e.code);
    throw e;
  }

  const input = {
    project_id: projectId,
    title,
    listing_type: listingType as ListingType,
    city,
    locality: text(formData, "locality"),
    type: (text(formData, "type") || "Plot") as PropertyType,
    size,
    area_marla: areaMarla,
    price_pkr: price,
    status: (text(formData, "status") || "Available") as PropertyStatus,
    description: text(formData, "description"),
    published: formData.get("published") === "on",
    ...(imagePath ? { image_path: imagePath } : {}),
    gallery: photos!.gallery,
  };
  const savedId = await upsertProperty({ id, ...input });
  if (imagePath && before) await removeImage(before.image_path);
  await Promise.all(photos!.removed.map((p) => removeImage(p)));
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
