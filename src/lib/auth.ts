import { randomBytes } from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import {
  createSessionRecord,
  deleteSessionByToken,
  findSessionByToken,
  getUserByLogin,
} from "@/lib/data";
import { isRoleEnabled } from "./release";
import { PASS_COOKIE, hashSessionToken, makePass, passCookieOptions } from "./session-pass";
import type { User } from "./types";

export const SESSION_COOKIE = "faryk_session";
export const SESSION_DAYS = 7;

/** Only the SHA-256 of a session token is stored, so a leaked DB cannot be used to log in. */
const hashToken = hashSessionToken;

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.Pu6S5S1mY3aZ6bCw3y6v1aQe0WyW";

/** Cached per request: the header, layout and page all resolve the same session with one query. */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // One query: the session together with its user.
  const session = await findSessionByToken(hashToken(token));
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await deleteSessionByToken(hashToken(token));
    return null;
  }
  const user = session.user;
  // Roles switched off for this release (DISABLED_FEATURES) are treated as logged out.
  return user && user.active && isRoleEnabled(user.role) ? user : null;
});

export async function createSession(userId: string): Promise<{ token: string; expires: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  await createSessionRecord(userId, hashToken(token), expires);
  return { token, expires };
}

/** Creates a session and sets the cookies (session + signed role pass) with the same hardened flags everywhere. */
export async function startSession(user: Pick<User, "id" | "role">): Promise<void> {
  const { token, expires } = await createSession(user.id);
  const jar = await cookies();
  // Session first: a client that keeps only one cookie still has a working login (the proxy then checks the
  // database instead of the pass).
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
  jar.set(PASS_COOKIE, makePass(hashToken(token), user.role, expires), passCookieOptions(expires));
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSessionByToken(hashToken(token));
  jar.delete(SESSION_COOKIE);
  jar.delete(PASS_COOKIE);
}

/** `login` is an email address or a customer's user ID. */
export async function verifyLogin(login: string, password: string): Promise<User | null> {
  const user = await getUserByLogin(login);
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  return ok && user && user.active ? user : null;
}
