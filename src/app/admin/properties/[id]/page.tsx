import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { getProjects, getPropertyById } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Edit listing" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default async function EditPropertyPage({ params, searchParams }: Props) {
  await requireStaff("properties", "update");
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [prop, projects] = await Promise.all([getPropertyById(id), getProjects()]);
  if (!prop) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminNav active="/admin/properties" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Edit listing</h1>
        <Link href={`/properties/${prop.id}`} className="text-sm text-teal-800 hover:underline" target="_blank">
          View on site ↗
        </Link>
      </div>
      <FormError code={error} />
      <PropertyForm property={prop} projects={projects} />
    </div>
  );
}
