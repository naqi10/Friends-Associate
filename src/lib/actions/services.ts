"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DIVISIONS, isKey } from "@/lib/catalog";
import { deleteService, getService, saveService, splitLines, writeAuditLog } from "@/lib/data";
import { ImageError, optionalImage, removeImage, saveImage } from "@/lib/images";
import { requireAdmin } from "@/lib/permissions";
import { isSafeLink } from "@/lib/seo";

const MAX_FEATURES = 15;

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function revalidateServiceViews() {
  revalidatePath("/architecture");
  revalidatePath("/construction");
  revalidatePath("/contact");
  revalidatePath("/admin/services");
}

export async function saveServiceAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = text(formData, "id", 60) || null;
  const formUrl = id ? `/admin/services/${id}` : "/admin/services/new";
  const back = (code: string) => redirect(`${formUrl}?error=${code}`);

  const division = text(formData, "division", 20);
  if (!isKey(DIVISIONS, division)) return back("category");
  const sortOrder = Number(formData.get("sort_order"));
  const input = {
    division,
    name: text(formData, "name", 80),
    icon: text(formData, "icon", 8),
    shortDescription: text(formData, "short_description", 300),
    features: splitLines(text(formData, "features", 3000)).map((f) => f.slice(0, 120)),
    startingPrice: text(formData, "starting_price", 60),
    estimatedDuration: text(formData, "estimated_duration", 60),
    ctaText: text(formData, "cta_text", 40),
    ctaUrl: text(formData, "cta_url", 300),
    sortOrder: Number.isInteger(sortOrder) && sortOrder >= 0 && sortOrder <= 999 ? sortOrder : 0,
    published: formData.get("published") === "on",
  };
  if (!input.name) back("required");
  if (input.features.length > MAX_FEATURES) back("features");
  if (input.ctaUrl && !isSafeLink(input.ctaUrl)) back("link");
  // A button needs both its text and where it goes.
  if (!!input.ctaText !== !!input.ctaUrl) back("cta");

  const before = id ? await getService(id) : null;
  if (id && !before) back("missing");

  let imagePath: string | undefined;
  const file = optionalImage(formData);
  if (file) {
    try {
      imagePath = await saveImage(file, "services");
    } catch (e) {
      if (e instanceof ImageError) back(e.code);
      throw e;
    }
  } else if (formData.get("remove_image") === "on") {
    imagePath = "";
  }

  const saved = await saveService(id, { ...input, ...(imagePath !== undefined ? { imagePath } : {}) });
  if (imagePath !== undefined && before?.imagePath && before.imagePath !== imagePath) await removeImage(before.imagePath);
  await writeAuditLog({ userId: actor.id, action: id ? "update" : "create", module: "services", recordId: saved.id, oldValue: before, newValue: saved });

  revalidateServiceViews();
  redirect(`/admin/services?saved=${id ? "updated" : "created"}#s-${saved.id}`);
}

export async function deleteServiceAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = text(formData, "id", 60);
  const before = await getService(id);
  if (!before) redirect("/admin/services?error=missing");
  await deleteService(id);
  await removeImage(before!.imagePath);
  await writeAuditLog({ userId: actor.id, action: "delete", module: "services", recordId: id, oldValue: before });

  revalidateServiceViews();
  redirect("/admin/services?saved=deleted");
}
