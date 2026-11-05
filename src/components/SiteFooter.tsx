import Link from "next/link";
import { Icon } from "@/components/admin/shell/icons";
import { FacebookIcon, InstagramIcon, YouTubeIcon } from "@/components/home/icons";
import { BRAND, isComingSoon } from "@/lib/brand";
import { getCompany, getHomeExtras, getOffices } from "@/lib/data";
import { Logo } from "@/components/Logo";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Services",
    links: [
      { href: "/architecture", label: "Architecture" },
      { href: "/construction", label: "Construction" },
      { href: "/products", label: "Construction products" },
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
const BADGE = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full";

export async function SiteFooter() {
  const [company, offices, extras] = await Promise.all([getCompany(), getOffices(), getHomeExtras()]);
  const social = [
    { href: extras.social.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: extras.social.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: extras.social.youtube, label: "YouTube", Icon: YouTubeIcon },
  ].filter((s) => s.href);
  const [services, properties, companyLinks] = COLUMNS;

  return (
    <footer className="mt-auto bg-ink text-paper">
      <div className="mx-auto max-w-[1280px] px-6 pt-20 pb-8">
        <div className="grid gap-10 border-b border-line-dark pb-14 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
          <div className="flex flex-col gap-4">
            <Logo variant="full" light className="w-[210px]" />
            <span className="font-serif text-[26px] leading-none">{company.name}</span>
            <span className="text-sm text-dim">{company.tagline}</span>
            {/* Phone and email with coloured icons. */}
            <div className="mt-2 flex flex-col gap-3 text-[15px]">
              <div className="flex items-center gap-3">
                <a href={`tel:${BRAND.phoneIntl.replace(/\s/g, "")}`} className={`${LINK} flex items-center gap-3 font-semibold`}>
                  <span className={`${BADGE} bg-amber-400 text-ink`}>
                    <Icon name="phone" className="h-[18px] w-[18px]" />
                  </span>
                  {BRAND.phone}
                </a>
              </div>
              <a href={`mailto:${company.email}`} className={`${LINK} flex min-w-0 items-center gap-3`}>
                <span className={`${BADGE} bg-sky-400 text-ink`}>
                  <Icon name="mail" className="h-[18px] w-[18px]" />
                </span>
                <span className="whitespace-nowrap">{company.email}</span>
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
                {isComingSoon(o.address) ? <span className="text-dim italic">Coming soon</span> : <span className="text-faint">{o.address}</span>}
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
            <span className="text-quiet"> · Developed by </span>
            <a href="https://tedxon.com" target="_blank" rel="noopener" className="font-semibold text-faint hover:text-paper">
              TEDXON.COM
            </a>
            <span className="text-quiet"> 2026</span>
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
