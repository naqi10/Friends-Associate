"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCustomer,
  deleteSessionsForUser,
  emailInUse,
  addLeadActivity,
  getCustomer,
  getLead,
  updateCustomer,
  updateLead,
  writeAuditLog,
} from "@/lib/data";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/permissions";
import { CITIES } from "@/lib/constants";
import { hashPassword, readNewPassword } from "@/lib/passwords";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CNIC_RE = /^\d{5}-\d{7}-\d$/;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/** Shared profile validation. Returns an error code, or the cleaned values. */
function readProfile(formData: FormData) {
  const profile = {
    name: text(formData, "name"),
    email: text(formData, "email").toLowerCase(),
    phone: text(formData, "phone"),
    city: text(formData, "city"),
    cnic: text(formData, "cnic"),
  };
  if (profile.name.length < 2 || profile.name.length > 120) return { error: "name" as const };
  if (!EMAIL_RE.test(profile.email) || profile.email.length > 200) return { error: "email" as const };
  if (!(CITIES as readonly string[]).includes(profile.city)) return { error: "city" as const };
  if (profile.cnic && !CNIC_RE.test(profile.cnic)) return { error: "cnic" as const };
  return { profile };
}

export async function createCustomerAction(formData: FormData) {
  const { user: actor, can } = await requireStaff("users", "add");
  const leadId = text(formData, "lead_id").slice(0, 60);
  const back = (code: string) => redirect(`/admin/customers/new?error=${code}${leadId ? `&lead=${encodeURIComponent(leadId)}` : ""}`);

  const { profile, error } = readProfile(formData);
  if (error || !profile) return back(error ?? "required");
  if (await emailInUse(profile.email)) return back("email-taken");

  const pw = readNewPassword(formData);
  if ("error" in pw) return back(pw.error);

  const passwordHash = await hashPassword(pw.password);
  const { id } = await createCustomer({ ...profile, passwordHash });
  await writeAuditLog({ userId: actor.id, action: "create", module: "customers", recordId: id, newValue: profile });

  // Converted from a lead: close the loop on the Sales desk.
  const lead = leadId && can("leads", "update") ? await getLead(leadId) : null;
  if (lead) {
    const result = await updateLead(lead.id, { status: "converted" });
    await prisma.lead.update({ where: { id: lead.id }, data: { convertedUserId: id } });
    await addLeadActivity(lead.id, actor.id, "convert", `Converted to customer ${profile.name}`);
    await writeAuditLog({ userId: actor.id, action: "convert", module: "leads", recordId: lead.id, oldValue: result?.before, newValue: { status: "converted", customerId: id } });
    revalidatePath("/sales");
  }

  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${id}?saved=created`);
}

export async function updateCustomerAction(formData: FormData) {
  const { user: actor } = await requireStaff("users", "update");
  const id = text(formData, "id");
  const before = await getCustomer(id);
  if (!before) redirect("/admin/customers?error=missing");
  const back = (code: string) => redirect(`/admin/customers/${id}?error=${code}`);

  const { profile, error } = readProfile(formData);
  if (error || !profile) return back(error ?? "required");
  if (await emailInUse(profile.email, id)) return back("email-taken");

  const active = formData.get("active") === "on";
  const after = await updateCustomer(id, { ...profile, active });
  // Deactivating an account must end any session that is already open.
  if (before.active && !active) await deleteSessionsForUser(id);
  await writeAuditLog({ userId: actor.id, action: "update", module: "customers", recordId: id, oldValue: before, newValue: after });

  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${id}?saved=profile`);
}

export async function setDownloadFeeAction(formData: FormData) {
  const { user: actor } = await requireStaff("users", "update");
  const id = text(formData, "id");
  const before = await getCustomer(id);
  if (!before) redirect("/admin/customers?error=missing");

  const paid = text(formData, "paid") === "1";
  const after = await updateCustomer(id, { documentDownloadPaidAt: paid ? new Date() : null });
  await writeAuditLog({
    userId: actor.id,
    action: paid ? "unlock-downloads" : "lock-downloads",
    module: "customers",
    recordId: id,
    oldValue: { documentDownloadPaidAt: before.documentDownloadPaidAt },
    newValue: { documentDownloadPaidAt: after.documentDownloadPaidAt },
  });

  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/customers");
  revalidatePath("/portal/documents");
  redirect(listReturn(formData, "saved=fee") ?? `/admin/customers/${id}?saved=fee`);
}

/** Back to the customers list with its filters, when the change was made from the list. */
function listReturn(formData: FormData, param: string) {
  const r = text(formData, "return");
  if (!/^\/admin\/customers(\?[A-Za-z0-9_\-=&.%+]*)?$/.test(r)) return null;
  return `${r}${r.includes("?") ? "&" : "?"}${param}`;
}

/** Switch a buyer account on or off from the list. Switching off signs them out everywhere. */
export async function setCustomerActiveAction(formData: FormData) {
  const { user: actor } = await requireStaff("users", "update");
  const id = text(formData, "id");
  const before = await getCustomer(id);
  if (!before) redirect("/admin/customers?error=missing");
  const active = text(formData, "active") === "1";
  await prisma.user.update({ where: { id }, data: { active } });
  if (!active) await deleteSessionsForUser(id);
  await writeAuditLog({ userId: actor.id, action: active ? "enable" : "disable", module: "customers", recordId: id, oldValue: { active: before!.active }, newValue: { active } });
  revalidatePath("/admin/customers");
  redirect(listReturn(formData, `saved=${active ? "enabled" : "disabled"}`) ?? `/admin/customers/${id}?saved=profile`);
}

export async function resetCustomerPasswordAction(formData: FormData) {
  const { user: actor } = await requireStaff("users", "update");
  const id = text(formData, "id");
  if (!(await getCustomer(id))) redirect("/admin/customers?error=missing");
  const back = (code: string) => redirect(`/admin/customers/${id}?error=${code}`);

  const pw = readNewPassword(formData);
  if ("error" in pw) return back(pw.error);

  await updateCustomer(id, { passwordHash: await hashPassword(pw.password) });
  // Sign the customer out everywhere so the old password's sessions stop working.
  await deleteSessionsForUser(id);
  await writeAuditLog({ userId: actor.id, action: "reset-password", module: "customers", recordId: id });

  redirect(`/admin/customers/${id}?saved=password`);
}
