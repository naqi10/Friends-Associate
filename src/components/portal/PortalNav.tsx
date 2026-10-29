"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/admin/shell/icons";

type Tab = { href: string; label: string; short?: string; icon: string; badge?: number; dot?: boolean; phone?: boolean; desktop?: boolean };

function tabs(unread: number, overdue: boolean): Tab[] {
  return [
    { href: "/portal", label: "Home", icon: "home", phone: true, desktop: true },
    { href: "/portal/properties", label: "My property", short: "Property", icon: "building", phone: true, desktop: true },
    { href: "/portal/payments", label: "Payments", icon: "card", badge: overdue ? 1 : 0, dot: overdue, phone: true, desktop: true },
    { href: "/portal/documents", label: "Documents", icon: "file", phone: true, desktop: true },
    { href: "/portal/progress", label: "Progress", icon: "helmet", desktop: true },
    { href: "/portal/notifications", label: "Notifications", icon: "bell", badge: unread, desktop: true },
    { href: "/portal/support", label: "Support", icon: "help", desktop: true },
    { href: "/portal/profile", label: "Account", icon: "user", phone: true, desktop: true },
  ];
}

function isActive(path: string, href: string) {
  if (href === "/portal") return path === "/portal";
  // A receipt belongs to Payments.
  if (href === "/portal/payments" && path.startsWith("/portal/receipts")) return true;
  return path === href || path.startsWith(`${href}/`);
}

/** Desktop: a row of tabs under the site header. */
export function PortalTabs({ unread, overdue }: { unread: number; overdue: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Customer portal" className="hidden border-b border-line bg-paper md:block print:hidden">
      <div className="mx-auto flex max-w-[1280px] gap-1 overflow-x-auto overflow-y-hidden px-6 [scrollbar-width:none] lg:gap-3">
        {tabs(unread, overdue)
          .filter((t) => t.desktop)
          .map((t) => {
            const active = isActive(path, t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex shrink-0 items-center gap-2 px-3 py-4 text-[15px] whitespace-nowrap ${active ? "font-semibold text-ink" : "text-body hover:text-ink"} ${t.href === "/portal/profile" ? "ml-auto" : ""}`}
              >
                <Icon name={t.icon} className="h-[18px] w-[18px]" />
                {t.label}
                {!!t.badge && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">
                    {t.badge > 9 ? "9+" : t.badge}
                  </span>
                )}
                {active && <span aria-hidden className="absolute inset-x-1 -bottom-px h-[3px] rounded-full bg-ink" />}
              </Link>
            );
          })}
      </div>
    </nav>
  );
}

/** Phones: five big buttons fixed at the bottom of the screen. */
export function PortalBottomNav({ unread, overdue }: { unread: number; overdue: boolean }) {
  const path = usePathname();
  return (
    <nav
      aria-label="Customer portal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
    >
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {tabs(unread, overdue)
          .filter((t) => t.phone)
          .map((t) => {
            const active = isActive(path, t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[12px] ${active ? "bg-mist font-semibold text-ink" : "text-muted"}`}
              >
                <span className="relative">
                  <Icon name={t.icon} className="h-6 w-6" />
                  {t.dot && <span className="absolute -top-0.5 -right-1 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-paper" />}
                  {t.dot && <span className="sr-only">(payment due)</span>}
                </span>
                {t.short ?? t.label}
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
