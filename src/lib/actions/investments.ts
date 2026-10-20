"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getInvestmentById, investmentSlugTaken, saveInvestment, writeAuditLog } from "@/lib/data";
import { INVESTMENT_STATUSES, INVESTMENT_TYPES, isKey } from "@/lib/catalog";
import { ImageError, optionalImage, removeImage, saveImage } from "@/lib/images";
import { prisma } from "@/lib/db";
import { todayPk } from "@/lib/format";
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

  // Financial figures are dated (PROJECT_SPEC §16): the date they were last checked, never in the future.
  const reviewedOn = text(formData, "figures_reviewed_on", 10) || todayPk();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedOn) || Number.isNaN(Date.parse(reviewedOn)) || reviewedOn > todayPk()) back("reviewed-date");

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
    figuresReviewedOn: reviewedOn,
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

/* ---------- Quick actions from the opportunity cards ---------- */

function backToList(formData: FormData, param: string): never {
  const r = String(formData.get("return") ?? "");
  const url = /^\/admin\/investments(\?[A-Za-z0-9_\-=&.%+]*)?$/.test(r) ? r : "/admin/investments";
  redirect(`${url}${url.includes("?") ? "&" : "?"}${param}`);
}

/** The "Published on website" switch. */
export async function toggleInvestmentPublishedAction(formData: FormData) {
  const { user } = await requireStaff("projects", "update");
  const id = String(formData.get("id") ?? "").slice(0, 60);
  const inv = await getInvestmentById(id);
  if (!inv || inv.archivedAt) backToList(formData, "error=missing");
  await prisma.investmentOpportunity.update({ where: { id }, data: { published: !inv!.published } });
  await writeAuditLog({ userId: user.id, action: inv!.published ? "unpublish" : "publish", module: "investments", recordId: id });
  revalidatePath("/investment", "layout");
  revalidatePath("/");
  backToList(formData, `saved=${inv!.published ? "unpublished" : "published"}`);
}

/** Open / Fully subscribed / Closed from the card menu. */
export async function setInvestmentStatusAction(formData: FormData) {
  const { user } = await requireStaff("projects", "update");
  const id = String(formData.get("id") ?? "").slice(0, 60);
  const status = String(formData.get("status") ?? "");
  if (!isKey(INVESTMENT_STATUSES, status)) backToList(formData, "error=required");
  const inv = await getInvestmentById(id);
  if (!inv || inv.archivedAt) backToList(formData, "error=missing");
  await prisma.investmentOpportunity.update({ where: { id }, data: { status } });
  await writeAuditLog({ userId: user.id, action: `status:${status}`, module: "investments", recordId: id, oldValue: { status: inv!.status }, newValue: { status } });
  revalidatePath("/investment", "layout");
  revalidatePath("/");
  backToList(formData, "saved=status");
}
