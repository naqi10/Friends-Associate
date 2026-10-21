import type { Metadata } from "next";
import { DivisionPage } from "@/components/public/DivisionPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Construction, waterproofing & construction chemicals",
  description:
    "Grey structure and turnkey construction, renovation and waterproofing for homes, commercial and industrial buildings by Friends Associates, Rahim Yar Khan.",
  path: "/construction",
});

type Props = { searchParams: Promise<{ category?: string }> };

export default async function ConstructionPage({ searchParams }: Props) {
  const { category } = await searchParams;
  return <DivisionPage division="construction" category={category} />;
}
