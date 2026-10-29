import { FormError } from "@/components/FormError";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Add project" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewProjectPage({ searchParams }: Props) {
  await requireStaff("projects", "add");
  const { error } = await searchParams;
  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <h1 className="text-[32px] leading-tight font-semibold tracking-tight lg:text-[44px]">Add project</h1>
      <FormError code={error} />
      <ProjectForm />
    </div>
  );
}
