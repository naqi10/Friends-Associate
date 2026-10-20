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
    <div className="px-5 py-10 sm:px-[30px]">
      <h1 className="text-2xl font-bold">Add listing</h1>
      <FormError code={error} />
      <PropertyForm projects={projects} />
    </div>
  );
}
