"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getSessionUser, startSession } from "@/lib/auth";
import {
  countRecentFailures,
  deleteSessionsForUser,
  recordLoginAttempt,
  setPasswordHash,
  writeAuditLog,
} from "@/lib/data";
import { sendPasswordChangedEmail } from "@/lib/email";
import { hashPassword, readNewPassword } from "@/lib/passwords";

const LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_WRONG_CURRENT = 5;

/** Change your own password: staff on /account, and customers the office allowed to (on /portal/profile). */
export async function changeOwnPasswordAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // Customers' passwords are set by the office, unless the office allowed this customer to change their own.
  if (user.role === "buyer" && !user.can_change_password) redirect("/portal/profile");
  const page = user.role === "buyer" ? "/portal/profile" : "/account";
  const back = (code: string) => redirect(`${page}?error=${code}`);

  // Rate-limit guesses of the current password from a stolen, still-open session.
  const key = `pw-change:${user.id}`;
  if ((await countRecentFailures(key, new Date(Date.now() - LOCK_WINDOW_MS))) >= MAX_WRONG_CURRENT) return back("locked");

  const current = String(formData.get("current") ?? "");
  const ok = await bcrypt.compare(current, user.password_hash);
  await recordLoginAttempt([key], ok);
  if (!ok) return back("current");

  const pw = readNewPassword(formData);
  if ("error" in pw) return back(pw.error);
  if (pw.password === current) return back("same");

  await setPasswordHash(user.id, await hashPassword(pw.password));
  // Sign out every other device, then start a fresh session here so this browser stays logged in.
  await deleteSessionsForUser(user.id);
  await startSession(user);
  await writeAuditLog({ userId: user.id, action: "change-own-password", module: user.role === "buyer" ? "customers" : "staff", recordId: user.id });
  if (user.role === "buyer" && user.email) {
    const email = user.email;
    after(() => sendPasswordChangedEmail({ name: user.name, email }, false));
  }

  redirect(`${page}?saved=password`);
}
