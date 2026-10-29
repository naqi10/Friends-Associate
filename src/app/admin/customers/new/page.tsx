import { FormError } from "@/components/FormError";
import { Field, SelectField } from "@/components/admin/Field";
import { createCustomerAction } from "@/lib/actions/customers";
import { CITIES, MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { getLead } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Add customer" };

type Props = { searchParams: Promise<{ error?: string; lead?: string }> };

export default async function NewCustomerPage({ searchParams }: Props) {
  const { can } = await requireStaff("users", "add");
  const { error, lead: leadId } = await searchParams;
  // "Convert to customer" from the Sales desk: start from the lead's details.
  const lead = leadId && can("leads", "update") ? await getLead(leadId) : null;
  const city = lead && (CITIES as readonly string[]).includes(lead.city) ? lead.city : undefined;

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <h1 className="text-[32px] leading-tight font-semibold tracking-tight lg:text-[44px]">Add customer</h1>
      <p className="mt-1.5 text-[15px] text-muted">
        Creates a buyer login. Share the password with the customer privately, not over a group chat.
      </p>
      {lead && (
        <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
          Converting lead <strong>{lead.name}</strong> ({lead.interest}). Check the details, give them a user ID (or email) to sign in with and a password. The lead is marked
          Converted when you save.
        </p>
      )}
      <FormError code={error} />
      <form action={createCustomerAction} className="mt-6 grid gap-4 admin-card p-6 sm:grid-cols-2">
        {lead && <input type="hidden" name="lead_id" value={lead.id} />}
        <div className="sm:col-span-2">
          <Field label="Full name" name="name" required minLength={2} maxLength={120} autoComplete="off" defaultValue={lead?.name} />
        </div>
        <Field
          label="User ID (for sign in)"
          name="username"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,39}"
          placeholder="e.g. ali.khan"
          hint="Small letters, numbers, dot, dash or underscore. The client signs in with this."
        />
        <Field
          label="Email (optional)"
          name="email"
          type="email"
          autoComplete="off"
          defaultValue={lead?.email || undefined}
          hint="Also works for sign in, and is used for notification emails."
        />
        <Field label="Phone" name="phone" type="tel" placeholder="+92 3xx xxxxxxx" defaultValue={lead?.phone} />
        <SelectField label="City" name="city" options={CITIES} required defaultValue={city} />
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
          <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
            Create customer
          </button>
        </div>
      </form>
    </div>
  );
}
