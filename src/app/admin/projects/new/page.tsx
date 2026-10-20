import { FormError } from "@/components/FormError";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Add project" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewProjectPage({ searchParams }: Props) {
  await requireStaff("projects", "add");
  const { error } = await searchParams;
  return (
    <div className="px-5 py-10 sm:px-[30px]">
      <h1 className="text-2xl font-bold">Add project</h1>
      <FormError code={error} />
      <ProjectForm />
    </div>
  );
}
