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
    <nav aria-label="Website content sections" className="mt-5 flex gap-2 overflow-x-auto pb-1 text-sm">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === active ? "page" : undefined}
          className={`shrink-0 rounded-full px-4 py-2 font-semibold ${
            t.href === active ? "bg-ink text-paper" : "border-[1.5px] border-line-strong bg-white text-body hover:bg-mist"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
