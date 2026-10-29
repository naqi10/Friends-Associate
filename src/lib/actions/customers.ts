"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCustomer,
  deleteSessionsForUser,
  emailInUse,
  usernameInUse,
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
/** Customer user ID: 3–40 characters, lowercase letters, numbers, dot, dash or underscore (no "@"). */
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,39}$/;

function readProfile(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const username = text(formData, "username").toLowerCase();
  const profile = {
    name: text(formData, "name"),
    email: email || null,
    username: username || null,
    phone: text(formData, "phone"),
    city: text(formData, "city"),
    cnic: text(formData, "cnic"),
  };
  if (profile.name.length < 2 || profile.name.length > 120) return { error: "name" as const };
  // Signs in with the user ID, the email, or either: at least one is needed.
  if (!profile.email && !profile.username) return { error: "login-needed" as const };
  if (profile.username && !USERNAME_RE.test(profile.username)) return { error: "username" as const };
  if (profile.email && (!EMAIL_RE.test(profile.email) || profile.email.length > 200)) return { error: "email" as const };
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
  if (profile.email && (await emailInUse(profile.email))) return back("email-taken");
  if (profile.username && (await usernameInUse(profile.username))) return back("username-taken");

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
  if (profile.email && (await emailInUse(profile.email, id))) return back("email-taken");
  if (profile.username && (await usernameInUse(profile.username, id))) return back("username-taken");

  const active = formData.get("active") === "on";
  const after = await updateCustomer(id, { ...profile, active });
  // Deactivating an account must end any session that is already open.
  if (before.active && !active) await deleteSessionsForUser(id);
  await writeAuditLog({ userId: actor.id, action: "update", module: "customers", recordId: id, oldValue: before, newValue: after });

  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${id}?saved=profile`);
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
