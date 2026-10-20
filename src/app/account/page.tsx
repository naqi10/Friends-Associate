import type { Metadata } from "next";
import { DeniedNotice } from "@/components/AdminNav";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { logoutAction } from "@/lib/actions/auth";
import { ROLE_LABELS } from "@/lib/permission-catalog";
import { requireStaff } from "@/lib/permissions";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ saved?: string; error?: string; denied?: string }> };

/** Staff self-service. Buyers manage their password from /portal/profile. */
export default async function AccountPage({ searchParams }: Props) {
  const { user } = await requireStaff();
  const sp = await searchParams;

  return (
    <div className="px-5 py-10 sm:px-[30px]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My account</h1>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-stone-600 hover:text-stone-900">
            Logout
          </button>
        </form>
      </div>
      <div className="mt-6">
        <DeniedNotice denied={sp.denied} />
      </div>
      <dl className="grid gap-4 admin-card p-6 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-stone-500">Name</dt>
          <dd className="font-medium">{user.name}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Role</dt>
          <dd>{user.role === "buyer" ? "Buyer" : ROLE_LABELS[user.role]}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Office</dt>
          <dd>{user.city}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-stone-500">To change your name, email or role, ask an administrator.</p>
      <div className="mt-6">
        <ChangePasswordForm saved={sp.saved} error={sp.error} />
      </div>
    </div>
  );
}
