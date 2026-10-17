import Link from "next/link";

const TABS = [
  { href: "/admin/content", label: "Home page" },
  { href: "/admin/content/pages", label: "Page headings" },
  { href: "/admin/content/about", label: "About & team" },
  { href: "/admin/content/contact", label: "Contact & footer" },
  { href: "/admin/content/faqs", label: "FAQs" },
  { href: "/admin/services", label: "Services" },
];

/** Sub-navigation for Admin → Website content. */
export function ContentTabs({ active }: { active: string }) {
  return (
    <nav aria-label="Website content sections" className="mt-4 flex gap-1 overflow-x-auto border-b border-stone-200 text-sm">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === active ? "page" : undefined}
          className={`-mb-px shrink-0 border-b-2 px-3 py-2 font-medium ${
            t.href === active ? "border-teal-800 text-teal-900" : "border-transparent text-stone-600 hover:text-stone-900"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
