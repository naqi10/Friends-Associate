import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { InvestmentForm } from "@/components/admin/InvestmentForm";
import { getInvestmentById, getProjects } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Edit investment opportunity" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default async function EditInvestmentPage({ params, searchParams }: Props) {
  await requireStaff("projects", "update");
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [inv, projects] = await Promise.all([getInvestmentById(id), getProjects()]);
  if (!inv) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminNav active="/admin/investments" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Edit investment opportunity</h1>
        <Link href={`/investment/${inv.slug}`} target="_blank" className="text-sm text-teal-800 hover:underline">
          View on site ↗
        </Link>
      </div>
      <FormError code={error} />
      <InvestmentForm inv={inv} projects={projects} />
    </div>
  );
}
