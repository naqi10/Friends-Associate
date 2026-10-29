import Link from "next/link";
import { FormError } from "@/components/FormError";
import { ServiceForm } from "@/components/admin/ServiceForm";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Add service" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewServicePage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <Link href="/admin/services" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-medium text-body hover:border-ink hover:text-ink">
        ← All services
      </Link>
      <h1 className="mt-5 text-[32px] leading-tight font-semibold tracking-tight lg:text-[44px]">Add service</h1>
      <FormError code={sp.error} />
      <ServiceForm />
    </div>
  );
}
