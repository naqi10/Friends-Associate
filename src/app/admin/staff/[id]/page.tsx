import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { Field, Notice, SelectField } from "@/components/admin/Field";
import { resetStaffPasswordAction, updateStaffAction } from "@/lib/actions/staff";
import { CITIES, MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { getStaffMember } from "@/lib/data";
import { ROLE_LABELS, ROLE_SUMMARIES, STAFF_ROLES } from "@/lib/permission-catalog";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Staff member" };

const SAVED: Record<string, string> = {
  created: "Staff account created.",
  profile: "Saved. If the role or access changed, they have been signed out and must log in again.",
  password: "Password reset. They have been signed out of all devices.",
};

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function StaffMemberPage({ params, searchParams }: Props) {
  const { user: actor } = await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const member = await getStaffMember(id);
  if (!member) notFound();
  const isSelf = member.id === actor.id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <AdminNav active="/admin/staff" />
      <Link href="/admin/staff" className="text-sm text-stone-600 hover:underline">
        ← All staff
      </Link>
      <h1 className="mt-2 text-2xl font-bold">
        {member.name} {isSelf && <span className="text-base font-normal text-stone-500">(you)</span>}
      </h1>
      <p className="text-sm text-stone-600">
        {ROLE_LABELS[member.role]} · {member.active ? "Active" : "Disabled"} · Last login{" "}
        {member.lastLoginAt
          ? member.lastLoginAt.toLocaleString("en-GB", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })
          : "never"}
      </p>
      <Notice message={sp.saved ? SAVED[sp.saved] : undefined} />
      <FormError code={sp.error} />

      <section className="mt-8 rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Account and role</h2>
        {isSelf && (
          <p className="mt-2 text-sm text-stone-600">
            You cannot change your own role or disable your own account. Another admin must do that.
          </p>
        )}
        <form action={updateStaffAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={member.id} />
          <div className="sm:col-span-2">
            <Field label="Full name" name="name" defaultValue={member.name} required />
          </div>
          <Field label="Work email (login)" name="email" type="email" defaultValue={member.email} required />
          <Field label="Phone" name="phone" type="tel" defaultValue={member.phone} />
          <SelectField label="Office" name="city" options={CITIES} defaultValue={member.city} required />
          {isSelf ? (
            <>
              {/* Locked for yourself; the server enforces this too. */}
              <input type="hidden" name="role" value={member.role} />
              <input type="hidden" name="active" value="on" />
              <Field label="Role" value={ROLE_LABELS[member.role]} readOnly disabled />
            </>
          ) : (
            <SelectField
              label="Role"
              name="role"
              defaultValue={member.role}
              options={STAFF_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
            />
          )}
          <p className="text-xs text-stone-500 sm:col-span-2">{ROLE_SUMMARIES[member.role]}</p>
          {!isSelf && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="active" defaultChecked={member.active} className="h-4 w-4" />
              Account active (unticking signs them out immediately and blocks login)
            </label>
          )}
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
              Save
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Reset password</h2>
        {isSelf ? (
          <p className="mt-2 text-sm text-stone-600">
            Change your own password from{" "}
            <Link href="/account" className="text-teal-800 underline">
              My account
            </Link>
            .
          </p>
        ) : (
          <form action={resetStaffPasswordAction} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={member.id} />
            <Field label="New temporary password" name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" />
            <Field label="Confirm password" name="confirm" type="password" required autoComplete="new-password" />
            <div className="sm:col-span-2">
              <button type="submit" className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50">
                Reset password and sign them out
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
