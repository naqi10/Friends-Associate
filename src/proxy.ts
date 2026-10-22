import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isApplicable } from "@/lib/permission-catalog";
import { isRoleEnabled } from "@/lib/release";
import { PASS_COOKIE, hashSessionToken, makePass, passCookieOptions, readPass } from "@/lib/session-pass";
import { accessRuleFor, HOME_REQUIREMENT, STAFF } from "@/lib/route-access";
import type { AppResource, AppRight, UserRole } from "@/lib/types";

const SESSION_COOKIE = "faryk_session";

const HOME: Record<UserRole, string> = {
  buyer: "/portal",
  sales: "/sales",
  project_manager: "/pm",
  admin: "/admin",
};

/**
 * Runs on Node (Next 16 proxy) before any page renders. Resolves the session and checks the route's
 * access rule against the live role matrix, so refusals are real 307 redirects rather than in-page ones.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rule = accessRuleFor(pathname);
  if (!rule) return NextResponse.next();

  const toLogin = () => {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  };

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return toLogin();
  const tokenHash = hashSessionToken(token);

  // Fast path: the signed role pass, no database. The proxy runs far from the database, where each query
  // costs ~0.7 s; the page itself re-checks the session in the database, next to it.
  let role = readPass(request.cookies.get(PASS_COOKIE)?.value, tokenHash) as UserRole | null;
  let newPass: { value: string; expires: Date } | null = null;
  if (!role) {
    // Sessions from before the pass existed (or a tampered pass): check once, then hand out a pass.
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      select: { expiresAt: true, user: { select: { role: true, active: true } } },
    });
    if (!session || session.expiresAt < new Date() || !session.user.active) return toLogin();
    role = session.user.role as UserRole;
    newPass = { value: makePass(tokenHash, role, session.expiresAt), expires: session.expiresAt };
  }
  if (!isRoleEnabled(role)) return toLogin();

  const withPass = (res: NextResponse) => {
    // Only on page loads: a form post may set its own session cookies (e.g. after a password change).
    if (newPass && (request.method === "GET" || request.method === "HEAD")) res.cookies.set(PASS_COOKIE, newPass.value, passCookieOptions(newPass.expires));
    return res;
  };
  const redirectTo = (path: string) => withPass(NextResponse.redirect(new URL(path, request.url)));

  if (rule.kind === "buyer") return role === "buyer" ? withPass(NextResponse.next()) : redirectTo(HOME[role]);
  if (!STAFF.includes(role)) return redirectTo(HOME[role]);
  if (rule.kind === "staff" || role === "admin") return withPass(NextResponse.next());

  const granted = await grantsFor(role);
  const can = ([res, right]: [AppResource, AppRight]) => isApplicable(role, res, right) && granted.has(`${res}:${right}`);

  if (rule.kind === "perm" && rule.any.some(can)) return withPass(NextResponse.next());
  // Denied. Send them to their desk, unless that desk is also closed to them (avoids a redirect loop).
  const home = HOME_REQUIREMENT[role];
  return redirectTo(home && !can(home) ? "/account?denied=1" : `${HOME[role]}?denied=1`);
}

/**
 * Role grants for sales / PM routing, remembered for a minute per proxy instance so a click does not wait for
 * the database. A permission change reaches the proxy within a minute; pages always use the live grants.
 */
const GRANTS_TTL_MS = 60_000;
const grantCache = new Map<string, { at: number; set: Set<string> }>();
async function grantsFor(role: string) {
  const hit = grantCache.get(role);
  if (hit && Date.now() - hit.at < GRANTS_TTL_MS) return hit.set;
  const rows = await prisma.rolePermission.findMany({ where: { role }, select: { resource: true, right: true } });
  const set = new Set(rows.map((g) => `${g.resource}:${g.right}`));
  grantCache.set(role, { at: Date.now(), set });
  return set;
}

export const config = {
  matcher: ["/portal/:path*", "/sales/:path*", "/pm/:path*", "/admin/:path*", "/account/:path*"],
};
