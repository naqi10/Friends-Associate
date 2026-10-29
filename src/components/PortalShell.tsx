import Link from "next/link";
import { Icon } from "@/components/admin/shell/icons";
import { PortalBottomNav, PortalTabs } from "@/components/portal/PortalNav";
import { BRAND } from "@/lib/brand";
import { getPortal, initials } from "@/lib/portal";

/**
 * Frame of every customer-portal page.
 * Desktop: the site header stays on top, with the portal tabs under it.
 * Phones: the site header is replaced by a slim portal bar (or a back bar on inner pages) and a bottom tab bar.
 */
export async function PortalShell({
  children,
  title,
  subtitle,
  back = "/portal",
}: {
  children: React.ReactNode;
  /** Inner pages: the page heading, also shown in a back bar on phones. The home page has its own greeting. */
  title?: string;
  subtitle?: string;
  back?: string;
}) {
  const { user, unread, overdue } = await getPortal();

  return (
    <div className="bg-canvas pb-28 md:pb-16 print:bg-white print:p-0">
      <PortalTabs unread={unread} overdue={overdue} />

      {/* Phone header */}
      {title ? (
        <div className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur md:hidden print:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link href={back} aria-label="Back" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mist">
              <Icon name="back" className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-[20px] leading-tight font-semibold">{title}</h1>
              {subtitle && <p className="truncate text-[14px] text-muted">{subtitle}</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur md:hidden print:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="leading-none">
              <span className="block font-serif text-[24px]">{BRAND.name}</span>
              <span className="mt-1 block text-[10px] tracking-[0.3em] text-muted uppercase">My portal</span>
            </Link>
            <div className="flex items-center gap-2.5">
              <Link
                href="/portal/notifications"
                aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper"
              >
                <Icon name="bell" className="h-5 w-5" />
                {unread > 0 && <span className="absolute top-2 right-2.5 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-paper" />}
              </Link>
              <Link href="/portal/profile" aria-label="My account" className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-paper">
                {initials(user.name)}
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6 md:px-10 md:pt-10 print:p-0">
        {title && (
          <div className="mb-8 hidden md:block print:hidden">
            <p className="text-[13px] font-semibold tracking-[0.12em] text-amber-800 uppercase">Customer portal</p>
            <h1 className="mt-2 font-serif text-[48px] leading-[1.05]">{title}</h1>
            {subtitle && <p className="mt-2 text-[17px] text-muted">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>

      <PortalBottomNav unread={unread} overdue={overdue} />
    </div>
  );
}
