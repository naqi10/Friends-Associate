"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createStaff,
  deleteStaff,
  deleteSessionsForUser,
  emailInUse,
  getStaffMember,
  StaffRuleError,
  updateStaff,
  writeAuditLog,
} from "@/lib/data";
import { CITIES } from "@/lib/constants";
import { STAFF_ROLES, type StaffRole } from "@/lib/permission-catalog";
import { requireAdmin } from "@/lib/permissions";
import { hashPassword, readNewPassword } from "@/lib/passwords";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readStaffProfile(formData: FormData) {
  const profile = {
    name: text(formData, "name"),
    email: text(formData, "email").toLowerCase(),
    phone: text(formData, "phone"),
    city: text(formData, "city"),
    role: text(formData, "role") as StaffRole,
  };
  if (profile.name.length < 2 || profile.name.length > 120) return { error: "name" as const };
  if (!EMAIL_RE.test(profile.email) || profile.email.length > 200) return { error: "email" as const };
  if (!(CITIES as readonly string[]).includes(profile.city)) return { error: "city" as const };
  if (!(STAFF_ROLES as readonly string[]).includes(profile.role)) return { error: "role" as const };
  return { profile };
}

export async function createStaffAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  // The Staff page has its own "Add staff member" panel; errors go back to it with the panel open.
  const fromList = text(formData, "from") === "list";
  const back = (code: string) => redirect(fromList ? `/admin/staff?add=1&error=${code}` : `/admin/staff/new?error=${code}`);

  const { profile, error } = readStaffProfile(formData);
  if (error || !profile) return back(error ?? "required");
  if (await emailInUse(profile.email)) return back("email-taken");
  const pw = readNewPassword(formData);
  if ("error" in pw) return back(pw.error);

  const { id } = await createStaff({ ...profile, passwordHash: await hashPassword(pw.password) });
  await writeAuditLog({ userId: actor.id, action: "create", module: "staff", recordId: id, newValue: profile });

  revalidatePath("/admin/staff");
  redirect(fromList ? `/admin/staff?saved=created` : `/admin/staff/${id}?saved=created`);
}

export async function updateStaffAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = text(formData, "id");
  const back = (code: string) => redirect(`/admin/staff/${id}?error=${code}`);

  const { profile, error } = readStaffProfile(formData);
  if (error || !profile) return back(error ?? "required");
  if (await emailInUse(profile.email, id)) return back("email-taken");
  const active = formData.get("active") === "on";

  // An admin cannot demote or disable themselves; another admin must do it. Prevents accidental lock-out.
  if (id === actor.id && (profile.role !== "admin" || !active)) return back("self");

  let failure = "";
  let result: Awaited<ReturnType<typeof updateStaff>> | undefined;
  try {
    result = await updateStaff(id, { ...profile, active });
  } catch (e) {
    if (e instanceof StaffRuleError) failure = e.code;
    else throw e;
  }
  if (failure || !result) return back(failure || "missing");

  const { before, after } = result;
  // Role or access changes take effect immediately: end every open session for that person.
  if (before.role !== after.role || (before.active && !after.active)) await deleteSessionsForUser(id);
  await writeAuditLog({ userId: actor.id, action: before.role !== after.role ? "change-role" : "update", module: "staff", recordId: id, oldValue: before, newValue: after });

  revalidatePath("/admin/staff");
  redirect(`/admin/staff/${id}?saved=profile`);
}

export async function resetStaffPasswordAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = text(formData, "id");
  const back = (code: string) => redirect(`/admin/staff/${id}?error=${code}`);
  if (!(await getStaffMember(id))) return back("missing");
  // Your own password is changed from My account, which asks for the current password.
  if (id === actor.id) return back("self-password");

  const pw = readNewPassword(formData);
  if ("error" in pw) return back(pw.error);

  await updateStaff(id, { passwordHash: await hashPassword(pw.password) });
  await deleteSessionsForUser(id);
  await writeAuditLog({ userId: actor.id, action: "reset-password", module: "staff", recordId: id });

  redirect(`/admin/staff/${id}?saved=password`);
}

const listBack = (code: string) => redirect(`/admin/staff?${code}`);

/** ⋮ menu → Make Sales / Project manager / Admin. Same rules as the edit page; signs the person out. */
export async function changeStaffRoleAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = text(formData, "id");
  const role = text(formData, "role") as StaffRole;
  if (!(STAFF_ROLES as readonly string[]).includes(role)) return listBack("error=role");
  if (id === actor.id) return listBack("error=self");
  let failure = "";
  let result: Awaited<ReturnType<typeof updateStaff>> | undefined;
  try {
    result = await updateStaff(id, { role });
  } catch (e) {
    if (e instanceof StaffRuleError) failure = e.code;
    else throw e;
  }
  if (failure || !result) return listBack(`error=${failure || "missing"}`);
  if (result.before.role !== role) {
    await deleteSessionsForUser(id);
    await writeAuditLog({ userId: actor.id, action: "change-role", module: "staff", recordId: id, oldValue: result.before, newValue: result.after });
  }
  revalidatePath("/admin/staff");
  return listBack("saved=role");
}

/** ⋮ menu → Switch account off / on. Switching off signs them out at once. */
export async function setStaffActiveAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = text(formData, "id");
  const active = text(formData, "active") === "1";
  if (id === actor.id) return listBack("error=self");
  let failure = "";
  let result: Awaited<ReturnType<typeof updateStaff>> | undefined;
  try {
    result = await updateStaff(id, { active });
  } catch (e) {
    if (e instanceof StaffRuleError) failure = e.code;
    else throw e;
  }
  if (failure || !result) return listBack(`error=${failure || "missing"}`);
  if (!active) await deleteSessionsForUser(id);
  await writeAuditLog({ userId: actor.id, action: active ? "activate" : "deactivate", module: "staff", recordId: id, oldValue: { active: result.before.active }, newValue: { active } });
  revalidatePath("/admin/staff");
  return listBack(active ? "saved=activated" : "saved=deactivated");
}

/** ⋮ menu → Delete account (see deleteStaff for what is kept). Never yourself, never the last admin. */
export async function deleteStaffAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = text(formData, "id");
  let failure = "";
  let result: Awaited<ReturnType<typeof deleteStaff>> | undefined;
  try {
    result = await deleteStaff(id, actor.id);
  } catch (e) {
    if (e instanceof StaffRuleError) failure = e.code;
    else throw e;
  }
  if (failure || !result) return listBack(`error=${failure || "missing"}`);
  await writeAuditLog({
    userId: actor.id,
    action: "delete",
    module: "staff",
    recordId: id,
    oldValue: { name: result.before.name, email: result.before.email, role: result.before.role },
    newValue: { unassignedLeads: result.unassignedLeads },
  });
  revalidatePath("/admin/staff");
  revalidatePath("/sales");
  return listBack(`saved=deleted&n=${result.unassignedLeads}`);
}
