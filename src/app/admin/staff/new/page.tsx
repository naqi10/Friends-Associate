import { AdminNav } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { Field, SelectField } from "@/components/admin/Field";
import { createStaffAction } from "@/lib/actions/staff";
import { CITIES, MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { ROLE_LABELS, ROLE_SUMMARIES, STAFF_ROLES } from "@/lib/permission-catalog";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Add staff member" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewStaffPage({ searchParams }: Props) {
  await requireAdmin();
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <AdminNav active="/admin/staff" />
      <h1 className="text-2xl font-bold">Add staff member</h1>
      <p className="mt-1 text-sm text-stone-600">
        Give the person their temporary password privately and ask them to change it from My account after first login.
      </p>
      <FormError code={error} />
      <form action={createStaffAction} className="mt-6 grid gap-4 rounded-xl border bg-white p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Full name" name="name" required minLength={2} maxLength={120} autoComplete="off" />
        </div>
        <Field label="Work email (login)" name="email" type="email" required autoComplete="off" />
        <Field label="Phone" name="phone" type="tel" />
        <SelectField label="Office" name="city" options={CITIES} required />
        <SelectField
          label="Role"
          name="role"
          required
          defaultValue="sales"
          options={STAFF_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
        />
        <ul className="space-y-1 rounded-md bg-stone-50 p-3 text-xs text-stone-600 sm:col-span-2">
          {STAFF_ROLES.map((r) => (
            <li key={r}>
              <span className="font-medium text-stone-800">{ROLE_LABELS[r]}:</span> {ROLE_SUMMARIES[r]}
            </li>
          ))}
        </ul>
        <Field
          label="Temporary password"
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
            Create staff account
          </button>
        </div>
      </form>
    </div>
  );
}
