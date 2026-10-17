"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ABOUT_LISTS, PAGE_CONTENT, type AboutListKey, type PageContentKey } from "@/lib/content-defaults";
import {
  deleteFaq,
  deleteTeamMember,
  getFaq,
  getOffices,
  getTeamMember,
  saveAboutList,
  saveFaq,
  savePageContent,
  saveTeamMember,
  splitLines,
  updateCompanyText,
  updateOffice,
  writeAuditLog,
  getAllPageContent,
} from "@/lib/data";
import { ImageError, optionalImage, removeImage, saveImage } from "@/lib/images";
import { requireAdmin } from "@/lib/permissions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,18}$/;
const MAX_LIST_ITEMS = 10;

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function order(formData: FormData) {
  const n = Number(formData.get("sort_order"));
  return Number.isInteger(n) && n >= 0 && n <= 999 ? n : 0;
}

/* ---------- Page headings ---------- */

export async function savePageContentAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const key = text(formData, "key", 60) as PageContentKey;
  if (!(key in PAGE_CONTENT)) redirect("/admin/content/pages?error=missing");
  const back = (code: string) => redirect(`/admin/content/pages?error=${code}#${key}`);
  const title = text(formData, "title", 120);
  const intro = text(formData, "intro", 600);
  if (!title) back("required");

  const before = (await getAllPageContent()).find((p) => p.key === key);
  await savePageContent(key, title, intro);
  await writeAuditLog({ userId: actor.id, action: "update", module: "content", recordId: key, oldValue: before, newValue: { title, intro } });

  revalidatePath(PAGE_CONTENT[key].path.split("?")[0]);
  redirect(`/admin/content/pages?saved=${encodeURIComponent(key)}#${key}`);
}

/* ---------- About ---------- */

export async function saveAboutAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const back = (code: string) => redirect(`/admin/content/about?error=${code}#about`);
  const company = {
    experience: text(formData, "experience", 1500),
    mission: text(formData, "mission", 600),
    vision: text(formData, "vision", 600),
  };
  const lists = (Object.keys(ABOUT_LISTS) as AboutListKey[]).map((key) => ({
    key,
    title: text(formData, `${key}.title`, 80) || ABOUT_LISTS[key].title,
    items: splitLines(text(formData, `${key}.items`, 3000)).map((i) => i.slice(0, 160)),
  }));
  if (lists.some((l) => l.items.length > MAX_LIST_ITEMS)) back("list-length");

  const { before } = await updateCompanyText(company);
  for (const l of lists) await saveAboutList(l.key, l.title, l.items);
  await writeAuditLog({
    userId: actor.id,
    action: "update",
    module: "content",
    recordId: "about",
    oldValue: { experience: before.experience, mission: before.mission, vision: before.vision },
    newValue: { ...company, ...Object.fromEntries(lists.map((l) => [l.key, l.items])) },
  });

  revalidatePath("/about");
  redirect("/admin/content/about?saved=about#about");
}

export async function saveTeamMemberAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = text(formData, "id", 60) || null;
  const back = (code: string) => redirect(`/admin/content/about?error=${code}#${id ? `m-${id}` : "team-new"}`);
  const input = {
    name: text(formData, "name", 80),
    title: text(formData, "title", 80),
    bio: text(formData, "bio", 600),
    experience: text(formData, "experience", 80),
    sortOrder: order(formData),
    active: formData.get("active") === "on",
  };
  if (!input.name || !input.title) back("required");

  const before = id ? await getTeamMember(id) : null;
  if (id && !before) back("missing");

  let photoPath: string | undefined;
  const file = optionalImage(formData);
  if (file) {
    try {
      photoPath = await saveImage(file, "team");
    } catch (e) {
      if (e instanceof ImageError) back(e.code);
      throw e;
    }
  } else if (formData.get("remove_photo") === "on") {
    photoPath = "";
  }

  const saved = await saveTeamMember(id, { ...input, ...(photoPath !== undefined ? { photoPath } : {}) });
  // Only delete the old file once the new one is safely stored and saved.
  if (photoPath !== undefined && before?.photoPath && before.photoPath !== photoPath) await removeImage(before.photoPath);
  await writeAuditLog({ userId: actor.id, action: id ? "update" : "create", module: "content", recordId: `team:${saved.id}`, oldValue: before, newValue: saved });

  revalidatePath("/about");
  redirect(`/admin/content/about?saved=team#m-${saved.id}`);
}

export async function deleteTeamMemberAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = text(formData, "id", 60);
  const before = await getTeamMember(id);
  if (!before) redirect("/admin/content/about?error=missing#team");
  await deleteTeamMember(id);
  await removeImage(before!.photoPath);
  await writeAuditLog({ userId: actor.id, action: "delete", module: "content", recordId: `team:${id}`, oldValue: before });

  revalidatePath("/about");
  redirect("/admin/content/about?saved=team-deleted#team");
}

/* ---------- Contact & footer ---------- */

export async function saveContactAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const back = (code: string) => redirect(`/admin/content/contact?error=${code}#company`);
  const input = {
    tagline: text(formData, "tagline", 120),
    email: text(formData, "email", 200).toLowerCase(),
    whatsapp: text(formData, "whatsapp", 30),
  };
  if (!input.tagline) back("required");
  if (!EMAIL_RE.test(input.email)) back("email");
  if (!PHONE_RE.test(input.whatsapp)) back("phone");

  const { before } = await updateCompanyText(input);
  await writeAuditLog({
    userId: actor.id,
    action: "update",
    module: "content",
    recordId: "company.contact",
    oldValue: { tagline: before.tagline, email: before.email, whatsapp: before.whatsapp },
    newValue: input,
  });

  revalidatePath("/", "layout");
  redirect("/admin/content/contact?saved=company#company");
}

export async function saveOfficeAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = text(formData, "id", 60);
  const back = (code: string) => redirect(`/admin/content/contact?error=${code}#o-${id}`);
  const input = { address: text(formData, "address", 200), phone: text(formData, "phone", 40), sortOrder: order(formData) };
  if (!input.address) back("required");
  if (input.phone && !PHONE_RE.test(input.phone)) back("phone");
  if (!(await getOffices()).some((o) => o.id === id)) back("missing");

  const result = await updateOffice(id, input);
  if (!result) back("missing");
  await writeAuditLog({ userId: actor.id, action: "update", module: "content", recordId: `office:${id}`, oldValue: result!.before, newValue: result!.after });

  revalidatePath("/", "layout");
  redirect(`/admin/content/contact?saved=office#o-${id}`);
}

/* ---------- FAQs ---------- */

export async function saveFaqAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = text(formData, "id", 60) || undefined;
  const back = (code: string) => redirect(`/admin/content/faqs?error=${code}#${id ? `f-${id}` : "faq-new"}`);
  const input = {
    question: text(formData, "question", 200),
    answer: text(formData, "answer", 1500),
    sortOrder: order(formData),
    active: formData.get("active") === "on",
  };
  if (!input.question || !input.answer) back("required");
  const before = id ? await getFaq(id) : null;
  if (id && !before) back("missing");

  const saved = await saveFaq({ ...input, id });
  await writeAuditLog({ userId: actor.id, action: id ? "update" : "create", module: "content", recordId: `faq:${saved.id}`, oldValue: before, newValue: saved });

  revalidatePath("/contact");
  redirect(`/admin/content/faqs?saved=faq#f-${saved.id}`);
}

export async function deleteFaqAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = text(formData, "id", 60);
  const before = await getFaq(id);
  if (!before) redirect("/admin/content/faqs?error=missing");
  await deleteFaq(id);
  await writeAuditLog({ userId: actor.id, action: "delete", module: "content", recordId: `faq:${id}`, oldValue: before });

  revalidatePath("/contact");
  redirect("/admin/content/faqs?saved=faq-deleted");
}

