"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { markNotificationsRead } from "@/lib/data";
import { requireUser } from "@/lib/require-user";

/** A buyer marks their own notifications as read (the user id comes from the session only). */
export async function markNotificationsReadAction() {
  const user = await requireUser(["buyer"]);
  await markNotificationsRead(user.id);
  revalidatePath("/portal", "layout");
  redirect("/portal/notifications");
}
