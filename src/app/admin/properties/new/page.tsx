import { FormError } from "@/components/FormError";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { getProjects } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Add listing" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewPropertyPage({ searchParams }: Props) {
  await requireStaff("properties", "add");
  const [{ error }, projects] = await Promise.all([searchParams, getProjects()]);
  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <h1 className="text-[32px] leading-tight font-semibold tracking-tight lg:text-[44px]">Add listing</h1>
      <FormError code={error} />
      <PropertyForm projects={projects} />
    </div>
  );
}
