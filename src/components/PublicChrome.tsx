"use client";

import { usePathname } from "next/navigation";

const STAFF = /^\/(admin|sales|pm|account)(\/|$)/;

/** Public header, footer and chat button: hidden on staff pages, which have their own layout. */
export function PublicChrome({ children }: { children: React.ReactNode }) {
  return STAFF.test(usePathname()) ? null : <>{children}</>;
}
