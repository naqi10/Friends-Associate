import type { Metadata } from "next";
import { DivisionPage } from "@/components/public/DivisionPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Architecture, drawings & NOC consultancy",
  description:
    "House planning, 2D/3D drawings, structural drawings, soil investigation, BOQ and NOC/approval consultancy for petrol pumps, LPG plants, mills and factories — Friends Associates, Rahim Yar Khan.",
  path: "/architecture",
});

type Props = { searchParams: Promise<{ category?: string }> };

export default async function ArchitecturePage({ searchParams }: Props) {
  const { category } = await searchParams;
  return <DivisionPage division="architecture" category={category} />;
}
