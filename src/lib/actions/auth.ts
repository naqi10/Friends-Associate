"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { destroySession, startSession, verifyLogin } from "@/lib/auth";
import { homeForRole } from "@/lib/permissions";
import { isRoleEnabled } from "@/lib/release";
import { countRecentFailures, deleteExpiredSessions, pruneLoginAttempts, recordLogin, recordLoginAttempt } from "@/lib/data";

const LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;

async function clientIp() {
  const h = await headers();
  // Trustworthy only behind a proxy that sets this header (Vercel, Nginx). The per-email limit still applies regardless.
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  // Only same-site paths: "//evil.com" and "/\evil.com" are treated by browsers as other origins.
  const safeNext = /^\/(?![/\\])/.test(next) ? next : "";
  const retry = (code: string) => redirect(`/login?error=${code}&next=${encodeURIComponent(safeNext)}`);

  if (!email || !password) retry("1");

  const keys = [`email:${email}`, `ip:${await clientIp()}`];
  const since = new Date(Date.now() - LOCK_WINDOW_MS);
  const [emailFailures, ipFailures] = await Promise.all(keys.map((k) => countRecentFailures(k, since)));
  if (emailFailures >= MAX_FAILURES_PER_EMAIL || ipFailures >= MAX_FAILURES_PER_IP) retry("locked");

  const user = await verifyLogin(email, password);
  await recordLoginAttempt(keys, !!user);
  if (!user) retry("1");
  // Correct password but the role is not live yet: say so, instead of a misleading "wrong password".
  // Only reachable with valid credentials, so it reveals nothing about which emails exist.
  if (!isRoleEnabled(user!.role)) retry("soon");

  await Promise.all([deleteExpiredSessions(user!.id), pruneLoginAttempts(), recordLogin(user!.id)]);
  await startSession(user!);

  redirect(safeNext || homeForRole(user!.role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
