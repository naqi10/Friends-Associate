import { createHash, createHmac, timingSafeEqual } from "crypto";

/**
 * A signed "role pass" cookie so the proxy (which runs away from the database) can route staff pages without a
 * database round trip on every click. It is bound to one session token and expires with it.
 *
 * It only decides routing. Every page still loads the session from the database (getSessionUser), so a
 * logged-out, deactivated or demoted user is still refused by the page itself.
 */
export const PASS_COOKIE = "faryk_pass";

function key() {
  // SESSION_SECRET if set; otherwise derived from the database URL, which is already secret and present
  // everywhere the app runs (no new setting needed).
  return process.env.SESSION_SECRET || createHash("sha256").update(`faryk-pass:${process.env.DATABASE_URL ?? ""}`).digest("hex");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sign(tokenHash: string, role: string, exp: number) {
  return createHmac("sha256", key()).update(`${tokenHash}|${role}|${exp}`).digest("base64url");
}

/** "<role>.<expiry seconds>.<signature>" */
export function makePass(tokenHash: string, role: string, expiresAt: Date) {
  const exp = Math.floor(expiresAt.getTime() / 1000);
  return `${role}.${exp}.${sign(tokenHash, role, exp)}`;
}

/** The role in a valid, unexpired pass for this session token, or null. */
export function readPass(value: string | undefined, tokenHash: string): string | null {
  const m = value?.match(/^([a-z_]+)\.(\d+)\.([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  const [, role, expRaw, sig] = m;
  const exp = Number(expRaw);
  if (exp * 1000 < Date.now()) return null;
  const want = Buffer.from(sign(tokenHash, role, exp));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got) ? role : null;
}

export const passCookieOptions = (expiresAt: Date) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  expires: expiresAt,
});
