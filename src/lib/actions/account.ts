"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getSessionUser, startSession } from "@/lib/auth";
import {
  countRecentFailures,
  deleteSessionsForUser,
  recordLoginAttempt,
  setPasswordHash,
  writeAuditLog,
} from "@/lib/data";
import { hashPassword, readNewPassword } from "@/lib/passwords";

const LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_WRONG_CURRENT = 5;

/** Change your own password. Works for every role; the form lives on /account and /portal/profile. */
export async function changeOwnPasswordAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
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
  await startSession(user.id);
  await writeAuditLog({ userId: user.id, action: "change-own-password", module: user.role === "buyer" ? "customers" : "staff", recordId: user.id });

  redirect(`${page}?saved=password`);
}
