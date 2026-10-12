import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { getProjectById } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Edit project" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default async function EditProjectPage({ params, searchParams }: Props) {
  const { can } = await requireStaff("projects", "update");
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const p = await getProjectById(id);
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminNav active="/admin/projects" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Edit project</h1>
        <div className="flex gap-4 text-sm">
          {can("progress", "view") && (
            <Link href={`/pm/${p.id}`} className="text-teal-800 hover:underline">
              Progress stages →
            </Link>
          )}
          <Link href={`/projects/${p.slug}`} className="text-teal-800 hover:underline" target="_blank">
            View on site ↗
          </Link>
        </div>
      </div>
      <FormError code={error} />
      <ProjectForm project={p} />
    </div>
  );
}
