import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import type { UserRole } from "@/lib/types";
import { homeForRole } from "@/lib/permissions";

export async function requireUser(allowed: UserRole[]) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!allowed.includes(user.role)) redirect(homeForRole(user.role));
  return user;
}
