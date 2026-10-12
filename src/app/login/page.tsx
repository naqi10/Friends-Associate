import type { Metadata } from "next";
import { loginAction } from "@/lib/actions/auth";
import { DEMO_PASSWORD } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Login",
  robots: { index: false },
};

type Props = { searchParams: Promise<{ error?: string; next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Login</h1>
      {sp.error === "1" && <p className="mt-2 text-sm text-red-600">Invalid email or password.</p>}
      {sp.error === "soon" && (
        <p className="mt-2 rounded-md bg-stone-100 p-3 text-sm text-stone-800">
          The staff portal is <strong>coming soon</strong>. Your account is ready; you will be able to sign in once it opens.
        </p>
      )}
      {sp.error === "locked" && (
        <p className="mt-2 text-sm text-red-600">Too many failed attempts. Please wait 15 minutes and try again.</p>
      )}
      <form action={loginAction} className="mt-8 space-y-4 rounded-xl border border-stone-200 bg-white p-6">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <div>
          <label className="text-sm font-medium">Email</label>
          <input name="email" type="email" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input name="password" type="password" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="w-full rounded-md bg-teal-800 py-2 text-sm font-medium text-white">
          Sign in
        </button>
      </form>
      {process.env.NODE_ENV !== "production" && (
      <p className="mt-6 text-xs text-stone-500">
        Demo password for all seed accounts: <code className="rounded bg-stone-100 px-1">{DEMO_PASSWORD}</code>
        <br />
        Buyers: ahmed.malik@example.com, fatima.siddiqui@example.com, bilal.hussain@example.com
        <br />
        Staff: sales@faryk.com, pm@faryk.com, admin@faryk.com
      </p>
      )}
    </div>
  );
}
