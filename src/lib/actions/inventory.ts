"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LISTING_TYPES, PROPERTY_TYPES, isKey, parseMarla } from "@/lib/catalog";
import { CITIES } from "@/lib/constants";
import { duplicateProject, propertiesWithActiveBooking, writeAuditLog } from "@/lib/data";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/permissions";
import { backfillPropertySlugs } from "@/lib/property-slug";

function text(formData: FormData, key: string, max = 200) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function back(formData: FormData, base: "/admin/projects" | "/admin/properties", param: string): never {
  const r = text(formData, "return", 400);
  const re = base === "/admin/projects" ? /^\/admin\/projects(\?[A-Za-z0-9_\-=&.%+]*)?$/ : /^\/admin\/properties(\?[A-Za-z0-9_\-=&.%+]*)?$/;
  const url = re.test(r) ? r : base;
  redirect(`${url}${url.includes("?") ? "&" : "?"}${param}`);
}

function revalidateSite() {
  revalidatePath("/", "layout");
}

/* ---------- Projects: quick actions from the card menu ---------- */

/** Feature on the home page / publish on the website, straight from the projects grid. */
export async function toggleProjectFlagAction(formData: FormData) {
  const { user } = await requireStaff("projects", "update");
  const id = text(formData, "id", 60);
  const flag = text(formData, "flag", 20);
  if (flag !== "featured" && flag !== "published") back(formData, "/admin/projects", "error=required");
  const p = await prisma.project.findUnique({ where: { id }, select: { featured: true, published: true, archivedAt: true, name: true } });
  if (!p) back(formData, "/admin/projects", "error=missing");
  if (p!.archivedAt) back(formData, "/admin/projects", "error=archived");
  const value = !p![flag as "featured" | "published"];
  // A featured project must be visible: featuring also publishes; unpublishing also un-features.
  const data =
    flag === "featured" ? { featured: value, ...(value ? { published: true } : {}) } : { published: value, ...(value ? {} : { featured: false }) };
  await prisma.project.update({ where: { id }, data });
  await writeAuditLog({ userId: user.id, action: `${flag}:${value ? "on" : "off"}`, module: "projects", recordId: id, oldValue: { featured: p!.featured, published: p!.published }, newValue: data });
  revalidateSite();
  back(formData, "/admin/projects", `saved=${flag}-${value ? "on" : "off"}`);
}

export async function duplicateProjectAction(formData: FormData) {
  const { user } = await requireStaff("projects", "add");
  const id = text(formData, "id", 60);
  const copy = await duplicateProject(id);
  if (!copy) back(formData, "/admin/projects", "error=missing");
  await writeAuditLog({ userId: user.id, action: "duplicate", module: "projects", recordId: copy!.id, newValue: { from: id, slug: copy!.slug } });
  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${copy!.id}?saved=duplicated`);
}

/* ---------- Properties: status, publish, bulk, CSV import ---------- */

const MANUAL_STATUSES = ["Available", "Sold"] as const;

/**
 * Status by hand: Available or Sold (e.g. sold outside the instalment system). "Booked" is never set by
 * hand; it follows the booking, and a unit with an active booking cannot be changed here.
 */
async function applyStatus(ids: string[], status: string, actorId: string) {
  const locked = await propertiesWithActiveBooking(ids);
  const free = ids.filter((id) => !locked.has(id));
  if (free.length) {
    await prisma.property.updateMany({ where: { id: { in: free }, archivedAt: null }, data: { status } });
    await writeAuditLog({ userId: actorId, action: `status:${status}`, module: "properties", newValue: { ids: free } });
  }
  return { changed: free.length, skipped: ids.length - free.length };
}

export async function setPropertyStatusAction(formData: FormData) {
  const { user } = await requireStaff("properties", "update");
  const id = text(formData, "id", 60);
  const status = text(formData, "status", 20);
  if (!(MANUAL_STATUSES as readonly string[]).includes(status)) back(formData, "/admin/properties", "error=required");
  const { changed } = await applyStatus([id], status, user.id);
  if (!changed) back(formData, "/admin/properties", "error=booked-status");
  revalidateSite();
  back(formData, "/admin/properties", `saved=status`);
}

export async function togglePropertyPublishedAction(formData: FormData) {
  const { user } = await requireStaff("properties", "update");
  const id = text(formData, "id", 60);
  const p = await prisma.property.findUnique({ where: { id }, select: { published: true, archivedAt: true } });
  if (!p || p.archivedAt) back(formData, "/admin/properties", "error=missing");
  await prisma.property.update({ where: { id }, data: { published: !p!.published } });
  await writeAuditLog({ userId: user.id, action: p!.published ? "unpublish" : "publish", module: "properties", recordId: id });
  revalidateSite();
  back(formData, "/admin/properties", `saved=${p!.published ? "unpublished" : "published"}`);
}

/** Ticked rows: "status:Available", "status:Sold", "publish", "unpublish" or "archive". */
export async function bulkPropertyAction(formData: FormData) {
  const { user } = await requireStaff("properties", "update");
  const ids = formData.getAll("ids").map(String).filter((x) => /^[0-9a-zA-Z-]{1,60}$/.test(x)).slice(0, 500);
  const op = text(formData, "op", 40);
  if (!ids.length || !op) back(formData, "/admin/properties", "error=bulk");
  if (op.startsWith("status:")) {
    const status = op.slice(7);
    if (!(MANUAL_STATUSES as readonly string[]).includes(status)) back(formData, "/admin/properties", "error=bulk");
    const { changed, skipped } = await applyStatus(ids, status, user.id);
    revalidateSite();
    back(formData, "/admin/properties", `saved=bulk&n=${changed}&skipped=${skipped}`);
  }
  if (op === "publish" || op === "unpublish") {
    const r = await prisma.property.updateMany({ where: { id: { in: ids }, archivedAt: null }, data: { published: op === "publish" } });
    await writeAuditLog({ userId: user.id, action: `bulk-${op}`, module: "properties", newValue: { ids } });
    revalidateSite();
    back(formData, "/admin/properties", `saved=bulk&n=${r.count}&skipped=0`);
  }
  if (op === "archive") {
    // Same rule as the single archive: a unit still being paid for (Booked with an active booking) stays.
    const locked = await propertiesWithActiveBooking(ids);
    const free = ids.filter((id) => !locked.has(id));
    const r = await prisma.property.updateMany({ where: { id: { in: free }, archivedAt: null }, data: { archivedAt: new Date(), published: false } });
    await writeAuditLog({ userId: user.id, action: "bulk-archive", module: "properties", newValue: { ids: free } });
    revalidateSite();
    back(formData, "/admin/properties", `saved=bulk&n=${r.count}&skipped=${ids.length - free.length}`);
  }
  back(formData, "/admin/properties", "error=bulk");
}

/* ---------- CSV import (PROJECT_SPEC §44) ---------- */

export type ImportResult = { ok: boolean; created: number; errors: { line: number; message: string }[] };

const HEADERS = ["title", "type", "listing", "city", "locality", "size", "price_pkr", "status", "project_slug", "description", "published"] as const;

/** Parses one CSV line with quotes ("a, b" and doubled "" quotes). */
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * Imports listings from a CSV. Every row is checked first; if any row is wrong nothing is saved and the
 * office gets a list of line-by-line problems to fix. Imported listings start unpublished unless "published" is yes.
 */
export async function importPropertiesAction(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const { user } = await requireStaff("properties", "add");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, created: 0, errors: [{ line: 0, message: "Choose a CSV file." }] };
  if (file.size > 2 * 1024 * 1024) return { ok: false, created: 0, errors: [{ line: 0, message: "The file is larger than 2 MB." }] };
  const lines = (await file.text()).replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { ok: false, created: 0, errors: [{ line: 0, message: "The file has no rows under the header." }] };
  if (lines.length > 501) return { ok: false, created: 0, errors: [{ line: 0, message: "Import at most 500 listings at a time." }] };

  const header = parseLine(lines[0]).map((h) => h.toLowerCase());
  const missing = ["title", "type", "listing", "city", "price_pkr"].filter((h) => !header.includes(h));
  if (missing.length) return { ok: false, created: 0, errors: [{ line: 1, message: `Missing column(s): ${missing.join(", ")}. Use the template.` }] };
  const col = (row: string[], name: (typeof HEADERS)[number]) => (header.indexOf(name) >= 0 ? (row[header.indexOf(name)] ?? "") : "");

  const projects = await prisma.project.findMany({ where: { archivedAt: null }, select: { id: true, slug: true } });
  const bySlug = new Map(projects.map((p) => [p.slug, p.id]));
  const errors: ImportResult["errors"] = [];
  const data: Parameters<typeof prisma.property.create>[0]["data"][] = [];

  lines.slice(1).forEach((line, i) => {
    const n = i + 2;
    const row = parseLine(line);
    const title = col(row, "title").slice(0, 150);
    const type = PROPERTY_TYPES.find((t) => t.toLowerCase() === col(row, "type").toLowerCase());
    const listing = col(row, "listing").toLowerCase() === "rent" ? "rent" : col(row, "listing").toLowerCase() === "sale" ? "sale" : null;
    const city = CITIES.find((c) => c.toLowerCase() === col(row, "city").toLowerCase());
    const price = Number(col(row, "price_pkr").replace(/[,\s]/g, ""));
    const statusRaw = col(row, "status") || "Available";
    const status = MANUAL_STATUSES.find((s) => s.toLowerCase() === statusRaw.toLowerCase());
    const slug = col(row, "project_slug");
    const projectId = slug ? bySlug.get(slug) : null;
    const size = col(row, "size").slice(0, 40);
    const problems: string[] = [];
    if (title.length < 3) problems.push("title is missing");
    if (!type) problems.push(`type must be one of ${PROPERTY_TYPES.join(", ")}`);
    if (!listing || !isKey(LISTING_TYPES, listing)) problems.push("listing must be sale or rent");
    if (!city) problems.push(`city must be one of ${CITIES.join(", ")}`);
    if (!Number.isSafeInteger(price) || price <= 0) problems.push("price_pkr must be a whole number above 0");
    if (!status) problems.push("status must be Available or Sold");
    if (slug && !projectId) problems.push(`no active project with slug "${slug}"`);
    if (problems.length) {
      errors.push({ line: n, message: problems.join("; ") });
      return;
    }
    data.push({
      title,
      type: type!,
      listingType: listing!,
      city: city!,
      locality: col(row, "locality").slice(0, 80),
      size: size || "—",
      areaMarla: parseMarla(size),
      pricePkr: price,
      status: status!,
      projectId: projectId ?? null,
      description: col(row, "description").slice(0, 2000),
      imagePath: "",
      published: /^(yes|true|1)$/i.test(col(row, "published")),
    });
  });

  if (errors.length) return { ok: false, created: 0, errors: errors.slice(0, 50) };
  await prisma.$transaction(data.map((d) => prisma.property.create({ data: d })));
  await backfillPropertySlugs(prisma);
  await writeAuditLog({ userId: user.id, action: "import", module: "properties", newValue: { rows: data.length, file: file.name } });
  revalidateSite();
  return { ok: true, created: data.length, errors: [] };
}
