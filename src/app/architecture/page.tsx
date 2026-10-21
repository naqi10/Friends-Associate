import type { Metadata } from "next";
import { DivisionPage } from "@/components/public/DivisionPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Architecture, drawings & NOC consultancy",
  description:
    "House plans, 2D/3D drawings, structural design, BOQ and NOC approvals for petrol pumps, LPG plants and factories by Friends Associates, Rahim Yar Khan.",
  path: "/architecture",
});

type Props = { searchParams: Promise<{ category?: string }> };

export default async function ArchitecturePage({ searchParams }: Props) {
  const { category } = await searchParams;
  return <DivisionPage division="architecture" category={category} />;
}
