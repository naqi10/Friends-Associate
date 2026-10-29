import Link from "next/link";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { Icon } from "@/components/admin/shell/icons";
import { PortalShell } from "@/components/PortalShell";
import { CARD } from "@/components/portal/ui";
import { logoutAction } from "@/lib/actions/auth";
import { getPortal, initials } from "@/lib/portal";

export const metadata = { title: "My account", robots: { index: false } };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function PortalProfilePage({ searchParams }: Props) {
  const { user } = await getPortal();
  const sp = await searchParams;
  const facts: [string, string][] = [
    ["Email (sign in)", user.email],
    ["Phone", user.phone],
    ["City", user.city],
    ["CNIC", user.cnic],
  ];

  return (
    <PortalShell title="My account">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className={`${CARD} p-6`}>
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-ink text-[22px] font-semibold text-paper">{initials(user.name)}</span>
              <div>
                <h2 className="text-[22px] font-semibold">{user.name}</h2>
                <p className="text-[15px] text-muted">Customer</p>
              </div>
            </div>
            <dl className="mt-6 divide-y divide-line">
              {facts.map(([k, v]) => (
                <div key={k} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-3.5">
                  <dt className="text-[15px] text-muted">{k}</dt>
                  <dd className="text-[16px] font-medium">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[14px] text-muted">
              Something wrong? <Link href="/portal/support" className="underline">Ask our office</Link> to correct it.
            </p>
          </section>

          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {[
              { href: "/portal/progress", label: "Construction progress", icon: "helmet" },
              { href: "/portal/notifications", label: "Notifications", icon: "bell" },
              { href: "/portal/support", label: "Help & support", icon: "help" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className={`${CARD} flex min-h-14 items-center gap-3 px-5 text-[16px] font-medium`}>
                <Icon name={l.icon} className="h-5 w-5" />
                <span className="flex-1">{l.label}</span>
                <Icon name="chevron" className="h-5 w-5 text-muted" />
              </Link>
            ))}
          </div>

          <form action={logoutAction}>
            <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-line-strong bg-paper text-[16px] font-medium hover:bg-mist">
              <Icon name="logout" className="h-5 w-5" /> Sign out
            </button>
          </form>
        </div>

        <section className={`${CARD} p-6`}>
          <ChangePasswordForm saved={sp.saved} error={sp.error} />
        </section>
      </div>
    </PortalShell>
  );
}
