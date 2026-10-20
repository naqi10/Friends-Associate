"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { logoutAction } from "@/lib/actions/auth";
import { Icon } from "./icons";
import type { NavGroup, NavItem } from "./nav";

type Props = {
  menu: NavGroup[];
  crumbs: NavItem[];
  badges: { leads: number; overdue: number };
  user: { name: string; role: string };
  home: string;
  canBook: boolean;
  canSeeBookings: boolean;
  canSearch: boolean;
  children: React.ReactNode;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** The menu item a path belongs to: the longest matching href, so /admin/bookings/x selects "Bookings". */
function activeItem(path: string, menu: NavGroup[], extra: NavItem[]) {
  let best: { item: NavItem; group: string } | null = null;
  const consider = (item: NavItem, group: string) => {
    const hit = path === item.href || path.startsWith(item.href + "/");
    if (hit && (!best || item.href.length > best.item.href.length)) best = { item, group };
  };
  for (const g of menu) for (const i of g.items) consider(i, g.label);
  for (const i of extra) consider(i, i.href.startsWith("/admin/services") ? "Administration" : i.href === "/account" ? "Account" : "Overview");
  return best as { item: NavItem; group: string } | null;
}

function Badge({ n, tone }: { n: number; tone: "neutral" | "alert" }) {
  if (!n) return null;
  return (
    <span
      className={`ml-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
        tone === "alert" ? "bg-red-50 text-red-700" : "bg-mist text-ink"
      }`}
    >
      {n}
    </span>
  );
}

export function ShellFrame({ menu, crumbs, badges, user, home, canBook, canSeeBookings, canSearch, children }: Props) {
  const path = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const active = activeItem(path, menu, crumbs);
  // Read once on the client; the server renders the Windows hint, then React swaps it without a mismatch.
  const isMac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  );
  // Ctrl/⌘ + K focuses search, as on the shortcut hint.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && canSearch) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canSearch]);

  const badgeFor = (i: NavItem) => (i.badge === "leads" ? badges.leads : i.badge === "overdue" ? badges.overdue : 0);
  const isActive = (i: NavItem) => active?.item.href === i.href;
  const flat = menu.flatMap((g) => g.items);
  const has = (href: string) => flat.some((i) => i.href === href);
  const bottom = [
    { href: home, label: "Home", icon: "home" },
    ...(has("/sales") && home !== "/sales" ? [{ href: "/sales", label: "Sales", icon: "sales" }] : []),
    ...(has("/admin/bookings") ? [{ href: "/admin/bookings", label: "Bookings", icon: "card", dot: badges.overdue > 0 }] : []),
    ...(has("/admin/projects") ? [{ href: "/admin/projects", label: "Projects", icon: "folder" }] : has("/pm") && home !== "/pm" ? [{ href: "/pm", label: "PM desk", icon: "helmet" }] : []),
  ].slice(0, 4) as { href: string; label: string; icon: string; dot?: boolean }[];

  const Sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-8 pb-6">
        <Link href={home} className="block">
          <span className="block font-serif text-[30px] leading-none text-ink">Friends Associates</span>
          <span className="mt-2 block text-[11px] tracking-[0.28em] text-muted uppercase">faryk.com · admin</span>
        </Link>
      </div>
      {canSearch && (
        <form action="/admin/search" className="px-4">
          <label className="flex items-center gap-2.5 rounded-2xl border border-line bg-white px-3.5 py-3 text-sm focus-within:border-ink">
            <Icon name="search" className="h-4.5 w-4.5 shrink-0 text-muted" />
            <input
              ref={searchRef}
              name="q"
              type="search"
              placeholder="Search customers, units…"
              aria-label="Search customers, units, projects and leads"
              className="w-full min-w-0 bg-transparent outline-none placeholder:text-quiet"
            />
            <kbd className="hidden shrink-0 rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted xl:inline">{isMac ? "⌘K" : "Ctrl K"}</kbd>
          </label>
        </form>
      )}
      <nav aria-label="Staff menu" className="mt-4 flex-1 overflow-y-auto px-4 pb-6">
        {menu.map((g) => (
          <div key={g.label} className="mt-5 first:mt-2">
            <p className="px-3 pb-2 text-[11px] font-semibold tracking-[0.22em] text-muted uppercase">{g.label}</p>
            <ul className="space-y-1">
              {g.items.map((i) => {
                const on = isActive(i);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      onClick={() => setDrawer(false)}
                      aria-current={on ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] transition ${
                        on ? "bg-ink font-medium text-paper" : "text-body hover:bg-mist hover:text-ink"
                      }`}
                    >
                      <Icon name={i.icon} className="h-5 w-5 shrink-0" />
                      <span className="truncate">{i.label}</span>
                      {!on && <Badge n={badgeFor(i)} tone={i.badge === "overdue" ? "alert" : "neutral"} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-3 border-t border-line px-5 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">{initials(user.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.role}</p>
        </div>
        <Link href="/account" onClick={() => setDrawer(false)} aria-label="My account" title="My account" className="rounded-full p-2 text-muted hover:bg-mist hover:text-ink">
          <Icon name="settings" />
        </Link>
        <form action={logoutAction}>
          <button type="submit" aria-label="Log out" title="Log out" className="rounded-full p-2 text-muted hover:bg-mist hover:text-ink">
            <Icon name="logout" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-mist text-ink print:bg-white">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[288px] border-r border-line bg-white lg:block print:hidden">{Sidebar}</aside>

      {/* Phone drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute inset-0 bg-ink/40" />
          <aside className="absolute inset-y-0 left-0 w-[min(320px,86vw)] overflow-y-auto bg-white shadow-2xl">
            <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="absolute top-6 right-4 rounded-full p-2 text-muted hover:bg-mist">
              <Icon name="close" />
            </button>
            {Sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-[288px] print:pl-0">
        {/* Desktop top bar */}
        <header className="sticky top-0 z-20 hidden h-[76px] items-center print:hidden gap-4 border-b border-line bg-white/90 px-[30px] backdrop-blur lg:flex">
          <p className="text-[15px] text-muted">
            {active ? (
              <>
                {active.group} <span className="mx-1">/</span> <span className="font-medium text-ink">{active.item.label}</span>
              </>
            ) : (
              <span className="font-medium text-ink">Staff</span>
            )}
          </p>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/" target="_blank" className="flex items-center gap-2 rounded-full px-3 py-2 text-[15px] text-body hover:bg-mist hover:text-ink">
              <Icon name="external" className="h-4.5 w-4.5" /> View website
            </Link>
            {canSeeBookings && (
              <Link
                href="/admin/reminders"
                aria-label={badges.overdue ? `${badges.overdue} overdue payments` : "Payment reminders"}
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white hover:bg-mist"
              >
                <Icon name="bell" />
                {badges.overdue > 0 && <span className="absolute top-2.5 right-3 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />}
              </Link>
            )}
            {canBook && (
              <Link href="/admin/bookings/new" className="flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-paper hover:bg-body">
                <Icon name="plus" className="h-4.5 w-4.5" /> New booking
              </Link>
            )}
          </div>
        </header>

        {/* Phone top bar */}
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur lg:hidden print:hidden">
          <div className="flex h-16 items-center gap-3 px-4">
            <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line">
              <Icon name="menu" />
            </button>
            <Link href={home} className="min-w-0">
              <span className="block truncate font-serif text-[22px] leading-none">Friends Associates</span>
              <span className="block text-[10px] tracking-[0.28em] text-muted uppercase">Admin</span>
            </Link>
            <div className="ml-auto flex items-center gap-1">
              {canSearch && (
                <button type="button" onClick={() => setMobileSearch((s) => !s)} aria-label="Search" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-mist">
                  <Icon name="search" />
                </button>
              )}
              {canSeeBookings && (
                <Link href="/admin/reminders" aria-label="Payment reminders" className="relative flex h-11 w-11 items-center justify-center rounded-full border border-line">
                  <Icon name="bell" />
                  {badges.overdue > 0 && <span className="absolute top-2.5 right-3 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />}
                </Link>
              )}
            </div>
          </div>
          {mobileSearch && canSearch && (
            <form
              action="/admin/search"
              className="px-4 pb-3"
              onSubmit={(e) => {
                e.preventDefault();
                const q = new FormData(e.currentTarget).get("q");
                setMobileSearch(false);
                router.push(`/admin/search?q=${encodeURIComponent(String(q ?? ""))}`);
              }}
            >
              <input
                name="q"
                type="search"
                autoFocus
                placeholder="Search customers, units…"
                aria-label="Search"
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-base outline-none focus:border-ink"
              />
            </form>
          )}
        </header>

        <main id="admin-main" className="pb-24 lg:pb-10">
          {children}
        </main>

        {/* Phone bottom bar */}
        <nav aria-label="Quick menu" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden">
          <ul className="flex">
            {bottom.map((b) => {
              const on = active?.item.href === b.href;
              return (
                <li key={b.href} className="flex-1">
                  <Link href={b.href} className="flex flex-col items-center gap-1 py-2.5 text-[11px]">
                    <span className={`relative flex h-9 w-14 items-center justify-center rounded-2xl ${on ? "bg-mist text-ink" : "text-muted"}`}>
                      <Icon name={b.icon} />
                      {b.dot && <span className="absolute top-1 right-3 h-2 w-2 rounded-full bg-red-600" />}
                    </span>
                    <span className={on ? "font-semibold text-ink" : "text-muted"}>{b.label}</span>
                  </Link>
                </li>
              );
            })}
            <li className="flex-1">
              <button type="button" onClick={() => setDrawer(true)} className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] text-muted">
                <span className="flex h-9 w-14 items-center justify-center rounded-2xl">
                  <Icon name="more" />
                </span>
                More
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
