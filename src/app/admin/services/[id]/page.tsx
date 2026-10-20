import Link from "next/link";
import { notFound } from "next/navigation";
import { FormError } from "@/components/FormError";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ServiceForm } from "@/components/admin/ServiceForm";
import { deleteServiceAction } from "@/lib/actions/services";
import { getService } from "@/lib/data";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Edit service" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default async function EditServicePage({ params, searchParams }: Props) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const service = await getService(id);
  if (!service) notFound();

  return (
    <div className="px-5 py-10 sm:px-[30px]">
      <Link href="/admin/services" className="text-sm text-stone-600 hover:underline">
        ← All services
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{service.name}</h1>
      <FormError code={sp.error} />
      <ServiceForm service={service} />

      <form action={deleteServiceAction} className="mt-6 rounded-[28px] border-2 border-red-200 bg-white shadow-[0_18px_40px_-18px_rgb(14_14_14/0.28)] p-6">
        <input type="hidden" name="id" value={service.id} />
        <h2 className="font-semibold text-red-800">Delete this service</h2>
        <p className="mt-1 text-sm text-stone-600">
          It disappears from the website straight away. To hide it for now and keep the text, untick Published instead.
        </p>
        <ConfirmButton message={`Delete the service "${service.name}"? This cannot be undone.`} className="mt-3">
          Delete service
        </ConfirmButton>
      </form>
    </div>
  );
}
