import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { ServiceForm } from "@/components/admin/ServiceForm";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Add service" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewServicePage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminNav active="/admin/content" />
      <Link href="/admin/services" className="text-sm text-stone-600 hover:underline">
        ← All services
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Add service</h1>
      <FormError code={sp.error} />
      <ServiceForm />
    </div>
  );
}
