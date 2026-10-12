import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/LegalPlaceholder";

// Not indexed until the real terms are published.
export const metadata: Metadata = { title: "Terms", robots: { index: false, follow: true } };

export default function TermsPage() {
  return <LegalPlaceholder title="Terms" />;
}
