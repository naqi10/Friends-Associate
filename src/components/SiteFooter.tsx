import Link from "next/link";
import { FacebookIcon, InstagramIcon, YouTubeIcon } from "@/components/home/icons";
import { BRAND } from "@/lib/brand";
import { getCompany, getHomeExtras, getOffices } from "@/lib/data";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Services",
    links: [
      { href: "/architecture", label: "Architecture" },
      { href: "/construction", label: "Construction" },
      { href: "/projects", label: "All projects" },
      { href: "/progress", label: "Project progress" },
      { href: "/investment", label: "Investment" },
    ],
  },
  {
    title: "Properties",
    links: [
      { href: "/properties?tab=buy", label: "Buy a property" },
      { href: "/properties?tab=rent", label: "Rent a property" },
      { href: "/properties?tab=sell", label: "Sell your property" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/news", label: "News & updates" },
      { href: "/documents", label: "Documents" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

const HEADING = "mb-1 text-xs font-semibold tracking-[0.2em] text-dim uppercase";
const LINK = "text-paper hover:text-faint";

export async function SiteFooter() {
  const [company, offices, extras] = await Promise.all([getCompany(), getOffices(), getHomeExtras()]);
  const whatsapp = `https://wa.me/${company.whatsapp.replace(/\D/g, "")}`;
  const social = [
    { href: extras.social.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: extras.social.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: extras.social.youtube, label: "YouTube", Icon: YouTubeIcon },
  ].filter((s) => s.href);
  const [services, properties, companyLinks] = COLUMNS;

  return (
    <footer className="mt-auto bg-ink text-paper">
      <div className="mx-auto max-w-[1280px] px-6 pt-20 pb-8">
        <div className="grid gap-10 border-b border-line-dark pb-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <span className="font-serif text-[32px] leading-none">{company.name}</span>
            <span className="text-sm text-dim">{company.tagline}</span>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              <a href={`tel:${BRAND.phoneIntl.replace(/\s/g, "")}`} className={LINK}>
                {BRAND.phone}
              </a>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={LINK}>
                WhatsApp {BRAND.phone}
              </a>
              <a href={`mailto:${company.email}`} className={LINK}>
                {company.email}
              </a>
            </div>
            {social.length > 0 && (
              <div className="mt-2 flex gap-2.5">
                {social.map(({ href, label, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${company.name} on ${label}`}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-line-dark-strong text-paper hover:border-faint"
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <span className={HEADING}>Offices</span>
            {offices.map((o) => (
              <span key={o.id}>
                <strong className="font-semibold">{o.city}</strong>
                {o.city === BRAND.city && <span className="text-dim"> · Head office</span>}
                <br />
                <span className="text-faint">{o.address}</span>
              </span>
            ))}
          </div>

          <nav aria-label="Services" className="flex flex-col gap-2.5 text-sm">
            <span className={HEADING}>{services.title}</span>
            {services.links.map((l) => (
              <Link key={l.href} href={l.href} className={LINK}>
                {l.label}
              </Link>
            ))}
          </nav>

          <nav aria-label="Properties and company" className="flex flex-col gap-2.5 text-sm">
            <span className={HEADING}>{properties.title}</span>
            {properties.links.map((l) => (
              <Link key={l.href} href={l.href} className={LINK}>
                {l.label}
              </Link>
            ))}
            <span className={`mt-4 ${HEADING}`}>{companyLinks.title}</span>
            {companyLinks.links.map((l) => (
              <Link key={l.href} href={l.href} className={LINK}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Extra bottom space on phones so the floating chat button never covers these links. */}
        <div className="flex flex-wrap justify-between gap-4 pt-6 pb-20 text-[13px] text-dim md:pb-0">
          <span>
            © {new Date().getFullYear()} {company.name} · {BRAND.domain}
          </span>
          <nav aria-label="Legal" className="flex flex-wrap gap-5">
            <Link href="/privacy" className="text-dim hover:text-paper">
              Privacy policy
            </Link>
            <Link href="/terms" className="text-dim hover:text-paper">
              Terms
            </Link>
            <Link href="/login" className="text-dim hover:text-paper">
              Customer login
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
