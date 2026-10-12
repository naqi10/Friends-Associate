import { createHash, randomBytes } from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import {
  createSessionRecord,
  deleteSessionByToken,
  findSessionByToken,
  getUserByEmail,
  getUserById,
} from "@/lib/data";
import { isRoleEnabled } from "./release";
import type { User } from "./types";

export const SESSION_COOKIE = "faryk_session";
export const SESSION_DAYS = 7;

/** Only the SHA-256 of a session token is stored, so a leaked DB cannot be used to log in. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.Pu6S5S1mY3aZ6bCw3y6v1aQe0WyW";

/** Cached per request: the header, layout and page all resolve the same session with one query. */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await findSessionByToken(hashToken(token));
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await deleteSessionByToken(hashToken(token));
    return null;
  }
  const user = await getUserById(session.userId);
  // Roles switched off for this release (DISABLED_FEATURES) are treated as logged out.
  return user && user.active && isRoleEnabled(user.role) ? user : null;
});

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  await createSessionRecord(userId, hashToken(token), expires);
  return token;
}

/** Creates a session and sets the cookie with the same hardened flags everywhere. */
export async function startSession(userId: string): Promise<void> {
  const token = await createSession(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSessionByToken(hashToken(token));
  jar.delete(SESSION_COOKIE);
}

export async function verifyLogin(email: string, password: string): Promise<User | null> {
  const user = await getUserByEmail(email.trim());
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  return ok && user && user.active ? user : null;
}
