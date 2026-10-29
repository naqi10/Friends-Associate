import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { MobileMenu } from "@/components/MobileMenu";
import { BRAND } from "@/lib/brand";
import { getCompany } from "@/lib/data";
import { homeForRole } from "@/lib/permissions";
import { Logo } from "@/components/Logo";
import { initials } from "@/lib/portal";

/** Kept short on purpose: About, Progress and News live in the footer. */
const nav = [
  { href: "/architecture", label: "Architecture" },
  { href: "/construction", label: "Construction" },
  { href: "/products", label: "Products" },
  { href: "/properties", label: "Properties" },
  { href: "/projects", label: "Projects" },
  { href: "/investment", label: "Investment" },
];

const TEL = `tel:${BRAND.phoneIntl.replace(/\s/g, "")}`;

export async function SiteHeader() {
  const [user, company] = await Promise.all([getSessionUser(), getCompany()]);
  const dash = user ? homeForRole(user.role) : "/login";
  const account = user ? (user.role === "buyer" ? "My account" : "Dashboard") : "Customer login";
  const whatsapp = `https://wa.me/${company.whatsapp.replace(/\D/g, "")}`;

  return (
    <>
      {/* 1. Utility bar */}
      <div className="bg-ink text-[13px] text-paper">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-5 gap-y-1 px-6 py-2.5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <a href={TEL} className="hover:text-faint">
              {BRAND.phone}
            </a>
            <a
              href={`mailto:${company.email}`}
              className="hidden hover:text-faint sm:inline"
            >
              {company.email}
            </a>
            <span className="hidden text-dim md:inline">
              Head office · {BRAND.city}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-faint"
            >
              WhatsApp
            </a>
            {!user && (
              <Link href={dash} className="hover:text-faint">
                {account} <span aria-hidden>→</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-6 py-[18px]">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3 leading-none"
            aria-label={`${BRAND.name} home`}
          >
            <Logo decorative priority className="w-[54px] sm:w-[60px]" />
            <span className="flex flex-col">
              <span className="font-serif text-[24px] text-ink sm:text-[28px]">
                {BRAND.name}
              </span>
              <span className="mt-1.5 text-[10px] tracking-[0.32em] text-muted uppercase">
                {BRAND.domain}
              </span>
            </span>
          </Link>

          <nav
            aria-label="Main"
            className="hidden items-center gap-7 text-[15px] font-medium text-ink lg:flex"
          >
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-muted"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {user ? (
            <Link
              href={dash}
              className="hidden min-h-12 items-center gap-3 rounded-full border border-line bg-paper py-1.5 pr-1.5 pl-5 text-[15px] font-semibold text-ink hover:border-ink lg:inline-flex"
            >
              {user.role === "buyer" ? "My account" : "Dashboard"}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-[13px] text-paper">{initials(user.name)}</span>
            </Link>
          ) : (
            <Link
              href="/contact"
              className="hidden min-h-11 items-center rounded-full bg-ink px-[22px] text-sm font-semibold text-paper hover:bg-body lg:inline-flex"
            >
              Contact us
            </Link>
          )}

          {/* Mobile: native disclosure menu (works without JavaScript). */}
          <MobileMenu
            className="group relative lg:hidden"
            summary={
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-ink px-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden
                  className="text-base leading-none group-open:hidden"
                >
                  ☰
                </span>
                <span
                  aria-hidden
                  className="hidden text-base leading-none group-open:inline"
                >
                  ✕
                </span>
                Menu
              </summary>
            }
          >
            <nav
              aria-label="Main (mobile)"
              className="absolute right-0 mt-2 w-64 rounded-card border border-line bg-paper p-2 text-[15px] font-medium shadow-xl"
            >
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-11 items-center rounded-lg px-3 text-ink hover:bg-mist"
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-2 border-t border-line" />
              <Link
                href={dash}
                className="flex min-h-11 items-center rounded-lg px-3 text-ink hover:bg-mist"
              >
                {account}
              </Link>
              <Link
                href="/contact"
                className="mt-1 flex min-h-11 items-center justify-center rounded-full bg-ink px-3 font-semibold text-paper"
              >
                Contact us
              </Link>
            </nav>
          </MobileMenu>
        </div>
      </header>
    </>
  );
}
