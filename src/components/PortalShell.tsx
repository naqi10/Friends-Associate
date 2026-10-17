import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";

const links = [
  { href: "/portal", label: "Home" },
  { href: "/portal/properties", label: "Properties" },
  { href: "/portal/payments", label: "Payments" },
  { href: "/portal/documents", label: "Documents" },
  { href: "/portal/profile", label: "Account" },
];

export function PortalShell({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="pb-20 md:pb-8">
      <div className="border-b border-stone-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase text-teal-800">Customer portal</p>
            {title && <h1 className="text-lg font-semibold">{title}</h1>}
          </div>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-stone-600 hover:text-stone-900">
              Logout
            </button>
          </form>
        </div>
        <nav className="mx-auto hidden max-w-4xl gap-4 px-4 pb-3 text-sm font-medium md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-teal-900 hover:underline">
              {l.label}
            </Link>
          ))}
          <Link href="/portal/progress" className="text-teal-900 hover:underline">
            Progress
          </Link>
        </nav>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
      <nav className="fixed bottom-0 left-0 right-0 flex border-t border-stone-200 bg-white text-xs md:hidden print:hidden">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="flex flex-1 flex-col items-center py-2 text-stone-700">
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
