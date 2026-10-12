import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/LegalPlaceholder";

// Not indexed until the real policy text is published.
export const metadata: Metadata = { title: "Privacy policy", robots: { index: false, follow: true } };

export default function PrivacyPage() {
  return <LegalPlaceholder title="Privacy policy" />;
}
