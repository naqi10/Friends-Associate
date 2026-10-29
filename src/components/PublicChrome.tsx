"use client";

import { usePathname } from "next/navigation";

const STAFF = /^\/(admin|sales|pm|account)(\/|$)/;

const PORTAL = /^\/portal(\/|$)/;

/**
 * Public header, footer and chat button: hidden on staff pages, which have their own layout.
 * `desktopOnInPortal`: on customer-portal pages this part shows on desktop only; phones get the portal's own bars.
 */
export function PublicChrome({ children, desktopOnInPortal = false }: { children: React.ReactNode; desktopOnInPortal?: boolean }) {
  const path = usePathname();
  if (STAFF.test(path)) return null;
  // "contents" keeps the sticky header working: the wrapper adds no box of its own on desktop.
  if (desktopOnInPortal && PORTAL.test(path)) return <div className="hidden md:contents print:hidden">{children}</div>;
  return <>{children}</>;
}
