"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getInvestmentById, investmentSlugTaken, saveInvestment, writeAuditLog } from "@/lib/data";
import { INVESTMENT_STATUSES, INVESTMENT_TYPES, isKey } from "@/lib/catalog";
import { ImageError, optionalImage, removeImage, saveImage } from "@/lib/images";
import { requireStaff } from "@/lib/permissions";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function text(formData: FormData, key: string, max = 300) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function amount(formData: FormData, key: string): number | null {
  const raw = text(formData, key).replace(/,/g, "");
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

/** Investment opportunities are managed with the Projects permission (add to create, update to edit). */
export async function saveInvestmentAction(formData: FormData) {
  const id = text(formData, "id", 60) || undefined;
  const { user: actor } = await requireStaff("projects", id ? "update" : "add");
  const back = (code: string) => redirect(`${id ? `/admin/investments/${id}` : "/admin/investments/new"}?error=${code}`);

  const slug = text(formData, "slug", 120).toLowerCase();
  const title = text(formData, "title", 150);
  const investmentType = text(formData, "investment_type", 40);
  const status = text(formData, "status", 40);
  const minimum = amount(formData, "minimum_investment_pkr");
  const targetRaw = text(formData, "target_amount_pkr");
  const target = targetRaw === "" ? null : amount(formData, "target_amount_pkr");
  const returnsNote = text(formData, "returns_note", 500);

  if (!title || !slug || !returnsNote) back("required");
  if (!SLUG_RE.test(slug)) back("slug");
  if (await investmentSlugTaken(slug, id)) back("slug-taken");
  if (!isKey(INVESTMENT_TYPES, investmentType) || !isKey(INVESTMENT_STATUSES, status)) back("required");
  if (minimum === null || (targetRaw !== "" && target === null)) back("number");
  // Guard against promising fixed returns in public copy.
  if (/guarantee(d)?\s+(return|profit)/i.test(returnsNote) && !/not\s+guarantee/i.test(returnsNote)) back("guarantee");

  const before = id ? await getInvestmentById(id) : null;
  if (id && !before) back("missing");

  let imagePath: string | undefined;
  const image = optionalImage(formData);
  if (image) {
    try {
      imagePath = await saveImage(image, "investments");
    } catch (e) {
      if (e instanceof ImageError) back(e.code);
      throw e;
    }
  }

  const data = {
    slug,
    title,
    projectId: text(formData, "project_id", 60) || null,
    investmentType,
    city: text(formData, "city", 60) || "Rahim Yar Khan",
    location: text(formData, "location", 120),
    summary: text(formData, "summary", 300),
    description: text(formData, "description", 5000),
    minimumInvestmentPkr: minimum!,
    targetAmountPkr: target,
    expectedDuration: text(formData, "expected_duration", 80),
    paymentStructure: text(formData, "payment_structure", 200),
    returnsNote,
    status,
    published: formData.get("published") === "on",
    sortOrder: amount(formData, "sort_order") ?? 0,
    ...(imagePath ? { imagePath } : {}),
  };
  const saved = await saveInvestment(id, data);
  if (imagePath && before) await removeImage(before.imagePath);
  await writeAuditLog({ userId: actor.id, action: id ? "update" : "create", module: "investments", recordId: saved.id, oldValue: before, newValue: data });

  revalidatePath("/investment", "layout");
  revalidatePath("/");
  redirect("/admin/investments?saved=1");
}
