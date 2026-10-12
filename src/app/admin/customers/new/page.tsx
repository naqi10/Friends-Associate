import { AdminNav } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { Field, SelectField } from "@/components/admin/Field";
import { createCustomerAction } from "@/lib/actions/customers";
import { CITIES, MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Add customer" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewCustomerPage({ searchParams }: Props) {
  await requireStaff("users", "add");
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <AdminNav active="/admin/customers" />
      <h1 className="text-2xl font-bold">Add customer</h1>
      <p className="mt-1 text-sm text-stone-600">
        Creates a buyer login. Share the password with the customer privately, not over a group chat.
      </p>
      <FormError code={error} />
      <form action={createCustomerAction} className="mt-6 grid gap-4 rounded-xl border bg-white p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Full name" name="name" required minLength={2} maxLength={120} autoComplete="off" />
        </div>
        <Field label="Email (login)" name="email" type="email" required autoComplete="off" />
        <Field label="Phone" name="phone" type="tel" placeholder="+92 3xx xxxxxxx" />
        <SelectField label="City" name="city" options={CITIES} required />
        <Field label="CNIC" name="cnic" placeholder="35202-1234567-1" pattern="\d{5}-\d{7}-\d" />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters with a letter and a number.`}
        />
        <Field label="Confirm password" name="confirm" type="password" required autoComplete="new-password" />
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
            Create customer
          </button>
        </div>
      </form>
    </div>
  );
}
