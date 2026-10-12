import { createHash } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isApplicable } from "@/lib/permission-catalog";
import { isRoleEnabled } from "@/lib/release";
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

  const session = await prisma.session.findUnique({
    where: { tokenHash: createHash("sha256").update(token).digest("hex") },
    select: { expiresAt: true, user: { select: { role: true, active: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active || !isRoleEnabled(session.user.role)) return toLogin();

  const role = session.user.role as UserRole;
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (rule.kind === "buyer") return role === "buyer" ? NextResponse.next() : redirectTo(HOME[role]);
  if (!STAFF.includes(role)) return redirectTo(HOME[role]);
  if (rule.kind === "staff" || role === "admin") return NextResponse.next();

  const grants = await prisma.rolePermission.findMany({ where: { role }, select: { resource: true, right: true } });
  const granted = new Set(grants.map((g) => `${g.resource}:${g.right}`));
  const can = ([res, right]: [AppResource, AppRight]) => isApplicable(role, res, right) && granted.has(`${res}:${right}`);

  if (rule.kind === "perm" && rule.any.some(can)) return NextResponse.next();
  // Denied. Send them to their desk, unless that desk is also closed to them (avoids a redirect loop).
  const home = HOME_REQUIREMENT[role];
  return redirectTo(home && !can(home) ? "/account?denied=1" : `${HOME[role]}?denied=1`);
}

export const config = {
  matcher: ["/portal/:path*", "/sales/:path*", "/pm/:path*", "/admin/:path*", "/account/:path*"],
};
