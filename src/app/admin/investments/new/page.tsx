import { FormError } from "@/components/FormError";
import { InvestmentForm } from "@/components/admin/InvestmentForm";
import { getProjects } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Add investment opportunity" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewInvestmentPage({ searchParams }: Props) {
  await requireStaff("projects", "add");
  const [{ error }, projects] = await Promise.all([searchParams, getProjects()]);
  return (
    <div className="px-5 py-10 sm:px-[30px]">
      <h1 className="text-2xl font-bold">Add investment opportunity</h1>
      <FormError code={error} />
      <InvestmentForm projects={projects} />
    </div>
  );
}
