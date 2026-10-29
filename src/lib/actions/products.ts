"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PRODUCT_CATEGORIES, isKey } from "@/lib/catalog";
import { deleteProduct, getProduct, parseOptions, saveProduct, splitLines, writeAuditLog } from "@/lib/data";
import { ImageError, optionalImage, removeImage, saveImage } from "@/lib/images";
import { requireAdmin } from "@/lib/permissions";

const MAX_LINES = 15;

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function revalidateProductViews(slug?: string) {
  revalidatePath("/products");
  if (slug) revalidatePath(`/products/${slug}`);
  revalidatePath("/admin/products");
  revalidatePath("/sitemap.xml");
}

export async function saveProductAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = text(formData, "id", 60) || null;
  const formUrl = id ? `/admin/products/${id}` : "/admin/products/new";
  const back = (code: string) => redirect(`${formUrl}?error=${code}`);

  const category = text(formData, "category", 30);
  if (!isKey(PRODUCT_CATEGORIES, category)) return back("category");
  const sortOrder = Number(formData.get("sort_order"));
  const optionsText = text(formData, "options", 2000);
  const input = {
    name: text(formData, "name", 120),
    category,
    brand: text(formData, "brand", 80),
    summary: text(formData, "summary", 400),
    options: parseOptions(optionsText).slice(0, MAX_LINES).map((o) => ({ label: o.label.slice(0, 40), pricePkr: o.pricePkr, unit: o.unit.slice(0, 40) })),
    benefits: splitLines(text(formData, "benefits", 3000)).map((l) => l.slice(0, 160)),
    specs: splitLines(text(formData, "specs", 3000)).map((l) => l.slice(0, 160)),
    note: text(formData, "note", 300),
    sortOrder: Number.isInteger(sortOrder) && sortOrder >= 0 && sortOrder <= 999 ? sortOrder : 0,
    published: formData.get("published") === "on",
  };
  if (!input.name) back("required");
  // Every non-empty price line must parse, so a typo never silently drops a price from the website.
  const priceLines = optionsText.split(/\r?\n/).filter((l) => l.trim()).length;
  if (priceLines !== parseOptions(optionsText).length) back("product-price");
  if (input.benefits.length > MAX_LINES || input.specs.length > MAX_LINES) back("features");

  const before = id ? await getProduct(id) : null;
  if (id && !before) back("missing");

  let imagePath: string | undefined;
  const file = optionalImage(formData);
  if (file) {
    try {
      imagePath = await saveImage(file, "products");
    } catch (e) {
      if (e instanceof ImageError) back(e.code);
      throw e;
    }
  } else if (formData.get("remove_image") === "on") {
    imagePath = "";
  }

  const saved = await saveProduct(id, { ...input, ...(imagePath !== undefined ? { imagePath } : {}) });
  if (imagePath !== undefined && before?.imagePath && before.imagePath !== imagePath) await removeImage(before.imagePath);
  await writeAuditLog({ userId: actor.id, action: id ? "update" : "create", module: "products", recordId: saved.id, oldValue: before, newValue: saved });

  revalidateProductViews(saved.slug);
  redirect(`/admin/products?saved=${id ? "updated" : "created"}#p-${saved.id}`);
}

/** Show / hide on the website from the list, without opening the form. */
export async function setProductPublishedAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = text(formData, "id", 60);
  const before = await getProduct(id);
  if (!before) redirect("/admin/products?error=missing");
  const published = formData.get("published") === "1";
  const p = before!;
  await saveProduct(id, {
    name: p.name,
    category: p.category,
    brand: p.brand,
    summary: p.summary,
    options: p.options,
    benefits: p.benefits,
    specs: p.specs,
    note: p.note,
    sortOrder: p.sortOrder,
    published,
  });
  await writeAuditLog({ userId: actor.id, action: published ? "publish" : "hide", module: "products", recordId: id, oldValue: { published: before!.published }, newValue: { published } });
  revalidateProductViews(before!.slug);
  redirect(`/admin/products?saved=${published ? "shown" : "hidden"}#p-${id}`);
}

export async function deleteProductAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = text(formData, "id", 60);
  const before = await getProduct(id);
  if (!before) redirect("/admin/products?error=missing");
  await deleteProduct(id);
  await removeImage(before!.imagePath);
  await writeAuditLog({ userId: actor.id, action: "delete", module: "products", recordId: id, oldValue: before });
  revalidateProductViews(before!.slug);
  redirect("/admin/products?saved=deleted");
}
