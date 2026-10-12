import type { Metadata } from "next";
import { requireStaff } from "@/lib/permissions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Friends Associates Admin" },
  robots: { index: false, follow: false },
};

/**
 * Gate before the loading boundary streams, so buyers and visitors get a real HTTP redirect.
 * Every page and action below still checks its own permission from the role matrix.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return children;
}
