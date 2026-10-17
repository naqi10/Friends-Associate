"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BookingRuleError,
  LifecycleError,
  cancelBooking,
  deleteCustomer,
  deleteDocumentRecord,
  deleteInvestment,
  deleteLead,
  deleteProject,
  deleteProperty,
  setInvestmentArchived,
  setProjectArchived,
  setPropertyArchived,
  writeAuditLog,
} from "@/lib/data";
import { removeImage } from "@/lib/images";
import { requireStaff } from "@/lib/permissions";
import { normalizeKey, storage } from "@/lib/storage";
import type { AppResource } from "@/lib/types";

function text(formData: FormData, key: string, max = 60) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

/** Maps rule failures to form error codes; unexpected errors are rethrown. */
function code(e: unknown): string {
  if (e instanceof LifecycleError || e instanceof BookingRuleError) return e.code;
  throw e;
}

function revalidatePublic() {
  revalidatePath("/", "layout");
}

/* ---------- Archive / restore ---------- */

const ARCHIVABLE = {
  project: { resource: "projects", module: "projects", edit: (id: string) => `/admin/projects/${id}`, run: setProjectArchived },
  property: { resource: "properties", module: "properties", edit: (id: string) => `/admin/properties/${id}`, run: setPropertyArchived },
  // Investment opportunities are managed with the Projects permission.
  investment: { resource: "projects", module: "investments", edit: (id: string) => `/admin/investments/${id}`, run: setInvestmentArchived },
} as const satisfies Record<string, { resource: AppResource; module: string; edit: (id: string) => string; run: unknown }>;

/** Archive (hide everywhere, keep the record) or restore. Needs Edit rights on that area. */
export async function setArchivedAction(formData: FormData) {
  const kind = text(formData, "kind") as keyof typeof ARCHIVABLE;
  const cfg = ARCHIVABLE[kind];
  if (!cfg) redirect("/admin");
  const { user: actor } = await requireStaff(cfg.resource, "update");
  const id = text(formData, "id");
  const archived = formData.get("archived") === "1";

  let failure = "";
  try {
    const { before, after } = await cfg.run(id, archived);
    await writeAuditLog({
      userId: actor.id,
      action: archived ? "archive" : "restore",
      module: cfg.module,
      recordId: id,
      oldValue: { archivedAt: before.archivedAt, published: before.published },
      newValue: { archivedAt: after.archivedAt, published: after.published },
    });
  } catch (e) {
    failure = code(e);
  }
  if (failure) redirect(`${cfg.edit(id)}?error=${failure}`);

  revalidatePublic();
  redirect(`${cfg.edit(id)}?saved=${archived ? "archived" : "restored"}`);
}

/* ---------- Permanent deletes ---------- */

export async function deleteProjectAction(formData: FormData) {
  const { user: actor } = await requireStaff("projects", "delete");
  const id = text(formData, "id");
  let failure = "";
  try {
    const before = await deleteProject(id);
    await removeImage(before.imagePath);
    await writeAuditLog({ userId: actor.id, action: "delete", module: "projects", recordId: id, oldValue: before });
  } catch (e) {
    failure = code(e);
  }
  if (failure) redirect(`/admin/projects/${id}?error=${failure}`);
  revalidatePublic();
  redirect("/admin/projects?saved=deleted");
}

export async function deletePropertyAction(formData: FormData) {
  const { user: actor } = await requireStaff("properties", "delete");
  const id = text(formData, "id");
  let failure = "";
  try {
    const before = await deleteProperty(id);
    await removeImage(before.imagePath);
    await writeAuditLog({ userId: actor.id, action: "delete", module: "properties", recordId: id, oldValue: before });
  } catch (e) {
    failure = code(e);
  }
  if (failure) redirect(`/admin/properties/${id}?error=${failure}`);
  revalidatePublic();
  redirect("/admin/properties?saved=deleted");
}

export async function deleteInvestmentAction(formData: FormData) {
  const { user: actor } = await requireStaff("projects", "delete");
  const id = text(formData, "id");
  let failure = "";
  try {
    const before = await deleteInvestment(id);
    await removeImage(before.imagePath);
    await writeAuditLog({ userId: actor.id, action: "delete", module: "investments", recordId: id, oldValue: before });
  } catch (e) {
    failure = code(e);
  }
  if (failure) redirect(`/admin/investments/${id}?error=${failure}`);
  revalidatePublic();
  redirect("/admin/investments?saved=deleted");
}

export async function deleteCustomerAction(formData: FormData) {
  const { user: actor } = await requireStaff("users", "delete");
  const id = text(formData, "id");
  let failure = "";
  try {
    const before = await deleteCustomer(id);
    await writeAuditLog({ userId: actor.id, action: "delete", module: "users", recordId: id, oldValue: before });
  } catch (e) {
    failure = code(e);
  }
  if (failure) redirect(`/admin/customers/${id}?error=${failure}`);
  redirect("/admin/customers?saved=deleted");
}

export async function deleteLeadAction(formData: FormData) {
  const { user: actor } = await requireStaff("leads", "delete");
  const id = text(formData, "id");
  let failure = "";
  try {
    const before = await deleteLead(id);
    await writeAuditLog({ userId: actor.id, action: "delete", module: "leads", recordId: id, oldValue: before });
  } catch (e) {
    failure = code(e);
  }
  if (failure) redirect(`/sales/leads/${id}?error=${failure}`);
  revalidatePath("/sales");
  redirect("/sales?saved=deleted");
}

export async function deleteDocumentAction(formData: FormData) {
  const { user: actor } = await requireStaff("documents", "delete");
  const id = text(formData, "id");
  let failure = "";
  try {
    const before = await deleteDocumentRecord(id);
    // The row is gone first, so a failed file removal can only leave an unreachable file, never a broken link.
    if (before.storagePath) await storage().remove(normalizeKey(before.storagePath)).catch(() => undefined);
    await writeAuditLog({ userId: actor.id, action: "delete", module: "documents", recordId: id, oldValue: before });
  } catch (e) {
    failure = code(e);
  }
  if (failure) redirect(`/admin/documents?error=${failure}`);
  revalidatePath("/documents");
  revalidatePath("/portal/documents");
  redirect("/admin/documents?saved=deleted");
}

/* ---------- Bookings ---------- */

/** Cancelling a sale is the booking's "delete": it needs Bookings → Delete. Nothing is removed. */
export async function cancelBookingAction(formData: FormData) {
  const { user: actor } = await requireStaff("bookings", "delete");
  const id = text(formData, "id");
  const reason = text(formData, "reason", 300);
  if (reason.length < 5) redirect(`/admin/bookings/${id}?error=cancel-reason`);
  let failure = "";
  try {
    const { before, after } = await cancelBooking(id, reason);
    await writeAuditLog({
      userId: actor.id,
      action: "cancel",
      module: "bookings",
      recordId: id,
      oldValue: { status: before.status, paidPkr: before.paidPkr, outstandingPkr: before.outstandingPkr },
      newValue: { status: after.status, reason, unit: "back to Available" },
    });
  } catch (e) {
    failure = code(e);
  }
  if (failure) redirect(`/admin/bookings/${id}?error=${failure}`);
  revalidatePublic();
  redirect(`/admin/bookings/${id}?saved=cancelled`);
}
