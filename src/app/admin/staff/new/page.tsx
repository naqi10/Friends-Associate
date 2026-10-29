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
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <h1 className="text-[32px] leading-tight font-semibold tracking-tight lg:text-[44px]">Add staff member</h1>
      <p className="mt-1.5 text-[15px] text-muted">
        Give the person their temporary password privately and ask them to change it from My account after first login.
      </p>
      <FormError code={error} />
      <form action={createStaffAction} className="mt-6 grid gap-4 admin-card p-6 sm:grid-cols-2">
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
          <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
            Create staff account
          </button>
        </div>
      </form>
    </div>
  );
}
