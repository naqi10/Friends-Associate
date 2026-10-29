import type { Metadata } from "next";
import { DeniedNotice } from "@/components/AdminNav";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { Icon } from "@/components/admin/shell/icons";
import { logoutAction } from "@/lib/actions/auth";
import { ROLE_LABELS } from "@/lib/permission-catalog";
import { requireStaff } from "@/lib/permissions";
import { initials } from "@/lib/portal";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ saved?: string; error?: string; denied?: string }> };

/** Staff self-service. Buyers manage their password from /portal/profile. */
export default async function AccountPage({ searchParams }: Props) {
  const { user } = await requireStaff();
  const sp = await searchParams;
  const role = user.role === "buyer" ? "Buyer" : ROLE_LABELS[user.role];
  const facts: [string, string][] = [
    ["Name", user.name],
    ["Email (sign in)", user.email],
    ["Role", role],
    ["Office", user.city],
  ];

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-tight font-semibold tracking-tight lg:text-[44px]">My account</h1>
          <p className="mt-1.5 text-[15px] text-muted">Your details and password.</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-white px-5 text-[15px] font-semibold hover:bg-mist"
          >
            <Icon name="logout" className="h-4.5 w-4.5" /> Sign out
          </button>
        </form>
      </div>
      <div className="mt-6">
        <DeniedNotice denied={sp.denied} />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <section className="admin-card p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-ink text-[22px] font-semibold text-paper">{initials(user.name)}</span>
            <div className="min-w-0">
              <h2 className="truncate text-[22px] font-semibold">{user.name}</h2>
              <span className="mt-1 inline-block rounded-full bg-mist px-3 py-1 text-xs font-semibold">{role}</span>
            </div>
          </div>
          <dl className="mt-6 divide-y divide-line">
            {facts.map(([k, v]) => (
              <div key={k} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-3.5 text-[15px]">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium">{v || "—"}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm text-muted">To change your name, email or role, ask an administrator.</p>
        </section>

        <div className="admin-card p-6">
          <ChangePasswordForm saved={sp.saved} error={sp.error} />
        </div>
      </div>
    </div>
  );
}
