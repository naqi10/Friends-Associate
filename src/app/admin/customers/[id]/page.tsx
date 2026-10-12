import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { Field, Notice, SelectField } from "@/components/admin/Field";
import {
  resetCustomerPasswordAction,
  setDownloadFeeAction,
  updateCustomerAction,
} from "@/lib/actions/customers";
import { CITIES, MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { getBookingsForUserDetailed, getCompany, getCustomer, MAX_BOOKINGS_PER_BUYER } from "@/lib/data";
import { formatDate, formatPkr } from "@/lib/format";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Customer" };

const SAVED: Record<string, string> = {
  created: "Customer created. You can now add their bookings.",
  profile: "Profile saved.",
  fee: "Document download access updated.",
  password: "Password reset. The customer has been signed out of all devices.",
};

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function CustomerDetailPage({ params, searchParams }: Props) {
  const { can } = await requireStaff("users", "view");
  const canEdit = can("users", "update");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [customer, bookings, company] = await Promise.all([getCustomer(id), getBookingsForUserDetailed(id), getCompany()]);
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <AdminNav active="/admin/customers" />
      <Link href="/admin/customers" className="text-sm text-stone-600 hover:underline">
        ← All customers
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{customer.name}</h1>
      <p className="text-sm text-stone-600">
        {customer.email} · {customer.active ? "Active account" : "Disabled account"}
      </p>
      <Notice message={sp.saved ? SAVED[sp.saved] : undefined} />
      <FormError code={sp.error} />

      {!canEdit && (
        <p className="mt-4 rounded-md bg-stone-100 p-3 text-sm text-stone-700">
          Read-only: you can view this customer but not change their account.
        </p>
      )}
      <section className="mt-8 rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Profile</h2>
        <form action={updateCustomerAction}>
          <fieldset disabled={!canEdit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={customer.id} />
          <div className="sm:col-span-2">
            <Field label="Full name" name="name" defaultValue={customer.name} required />
          </div>
          <Field label="Email (login)" name="email" type="email" defaultValue={customer.email} required />
          <Field label="Phone" name="phone" type="tel" defaultValue={customer.phone} />
          <SelectField label="City" name="city" options={CITIES} defaultValue={customer.city} required />
          <Field label="CNIC" name="cnic" defaultValue={customer.cnic} pattern="\d{5}-\d{7}-\d" />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="active" defaultChecked={customer.active} className="h-4 w-4" />
            Account active (unticking signs the customer out and blocks login)
          </label>
          <div className="sm:col-span-2">
            {canEdit && (
              <button type="submit" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
                Save profile
              </button>
            )}
          </div>
          </fieldset>
        </form>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Document downloads</h2>
          {customer.documentDownloadPaidAt ? (
            <p className="mt-2 text-sm text-teal-800">
              Unlocked on {formatDate(customer.documentDownloadPaidAt.toISOString())}.
            </p>
          ) : (
            <p className="mt-2 text-sm text-amber-800">
              Locked. One-time fee of PKR {company.document_download_fee_pkr.toLocaleString("en-PK")} not yet recorded.
            </p>
          )}
          {canEdit && (
          <form action={setDownloadFeeAction} className="mt-4">
            <input type="hidden" name="id" value={customer.id} />
            <input type="hidden" name="paid" value={customer.documentDownloadPaidAt ? "0" : "1"} />
            <button
              type="submit"
              className={`rounded-md px-4 py-2 text-sm font-medium ${customer.documentDownloadPaidAt ? "border border-stone-300 text-stone-700 hover:bg-stone-50" : "bg-teal-800 text-white hover:bg-teal-900"}`}
            >
              {customer.documentDownloadPaidAt ? "Lock downloads again" : "Mark fee paid and unlock"}
            </button>
          </form>
          )}
        </section>

        {canEdit && (
        <section className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Reset password</h2>
          <form action={resetCustomerPasswordAction} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={customer.id} />
            <Field label="New password" name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" />
            <Field label="Confirm new password" name="confirm" type="password" required autoComplete="new-password" />
            <button type="submit" className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50">
              Reset password
            </button>
          </form>
        </section>
        )}
      </div>

      <section className="mt-6 rounded-xl border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">
            Bookings ({bookings.length}/{MAX_BOOKINGS_PER_BUYER})
          </h2>
          {can("bookings", "add") && customer.active && bookings.length < MAX_BOOKINGS_PER_BUYER && (
            <Link
              href={`/admin/bookings/new?buyer=${customer.id}`}
              className="rounded-md bg-teal-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-900"
            >
              Add booking
            </Link>
          )}
        </div>
        {bookings.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">No properties assigned to this customer yet.</p>
        ) : (
          <ul className="mt-4 divide-y text-sm">
            {bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">{b.property.title}</p>
                  <p className="text-stone-600">
                    {b.project.name} · Paid {formatPkr(b.paid_pkr)} · Outstanding {formatPkr(b.outstanding_pkr)}
                  </p>
                </div>
                {can("bookings", "view") && (
                  <Link href={`/admin/bookings/${b.id}`} className="text-teal-800 hover:underline">
                    Manage payments
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
