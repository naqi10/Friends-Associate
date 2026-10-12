import type { Metadata } from "next";
import { requireUser } from "@/lib/require-user";

export const metadata: Metadata = { title: "Customer portal", robots: { index: false, follow: false } };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requireUser(["buyer"]);
  return children;
}
