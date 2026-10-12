"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { replaceEditableGrants, writeAuditLog } from "@/lib/data";
import {
  DEFAULT_GRANTS,
  EDITABLE_ROLES,
  RESOURCES,
  RIGHTS,
  isApplicable,
  type Grant,
} from "@/lib/permission-catalog";
import { requireAdmin } from "@/lib/permissions";

/**
 * Rebuilds the grant list from checkbox names "perm:<role>:<resource>:<right>".
 * Only known, applicable combinations are accepted; anything else in the form is ignored.
 */
function readGrants(formData: FormData): Grant[] {
  const grants: Grant[] = [];
  for (const role of EDITABLE_ROLES) {
    for (const res of RESOURCES) {
      const rights = RIGHTS.filter(
        (right) =>
          isApplicable(role.key, res.key, right.key) &&
          formData.get(`perm:${role.key}:${res.key}:${right.key}`) === "on",
      ).map((r) => r.key);
      // Add/Edit/Delete imply View, matching the screen's behaviour even for hand-crafted requests.
      if (rights.length && !rights.includes("view") && isApplicable(role.key, res.key, "view")) rights.push("view");
      for (const right of rights) grants.push({ role: role.key, resource: res.key, right });
    }
  }
  return grants;
}

async function apply(actorId: string, grants: Grant[], action: string) {
  const { added, removed } = await replaceEditableGrants(grants);
  if (added.length || removed.length) {
    await writeAuditLog({ userId: actorId, action, module: "permissions", newValue: { added, removed } });
  }
  // Every page reads permissions, so refresh the whole app.
  revalidatePath("/", "layout");
  return added.length + removed.length;
}

export async function savePermissionsAction(formData: FormData) {
  const { user } = await requireAdmin();
  const changed = await apply(user.id, readGrants(formData), "update");
  redirect(`/admin/permissions?saved=${changed}`);
}

export async function resetPermissionsAction() {
  const { user } = await requireAdmin();
  const defaults = DEFAULT_GRANTS.filter((g) => g.role !== "admin");
  const changed = await apply(user.id, defaults, "reset-defaults");
  redirect(`/admin/permissions?saved=${changed}&reset=1`);
}
