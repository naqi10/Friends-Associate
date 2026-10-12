import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { CustomersTable } from "@/components/admin/CustomersTable";
import { getCustomerRows } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Customers" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function AdminCustomersPage({ searchParams }: Props) {
  const { can } = await requireStaff("users", "view");
  const [{ error }, rows] = await Promise.all([searchParams, getCustomerRows()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminNav active="/admin/customers" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-stone-600">Buyer accounts, document download access and passwords.</p>
        </div>
        {can("users", "add") && (
          <Link href="/admin/customers/new" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
            Add customer
          </Link>
        )}
      </div>
      <FormError code={error} />
      <div className="mt-6">
        <CustomersTable rows={rows} />
      </div>
    </div>
  );
}
