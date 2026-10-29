import { Field, Notice } from "@/components/admin/Field";
import { FormError } from "@/components/FormError";
import { changeOwnPasswordAction } from "@/lib/actions/account";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";

/** "Change my password" for any logged-in user. Shared by /account (staff) and /portal/profile (buyers); the page supplies the card. */
export function ChangePasswordForm({ saved, error }: { saved?: string; error?: string }) {
  return (
    <section>
      <h2 className="text-[20px] font-semibold">Change password</h2>
      <p className="mt-1 text-sm text-muted">You will stay signed in here; all your other devices will be signed out.</p>
      <Notice message={saved === "password" ? "Password changed. Other devices have been signed out." : undefined} />
      <FormError code={error} />
      <form action={changeOwnPasswordAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Current password" name="current" type="password" required autoComplete="current-password" />
        </div>
        <Field
          label="New password"
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters with a letter and a number.`}
        />
        <Field label="Confirm new password" name="confirm" type="password" required autoComplete="new-password" />
        <div className="sm:col-span-2">
          <button type="submit" className="min-h-11 rounded-full bg-ink px-6 text-[15px] font-semibold text-paper hover:bg-body">
            Change password
          </button>
        </div>
      </form>
    </section>
  );
}
