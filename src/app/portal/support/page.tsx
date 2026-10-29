import { Icon } from "@/components/admin/shell/icons";
import { PortalShell } from "@/components/PortalShell";
import { BTN_INK, CARD, SentNotice } from "@/components/portal/ui";
import { portalRequestAction } from "@/lib/actions/portal";
import { BRAND } from "@/lib/brand";
import { getCompany, getHomeExtras, getOffices } from "@/lib/data";
import { getPortal } from "@/lib/portal";

export const metadata = { title: "Support", robots: { index: false } };

type Props = { searchParams: Promise<{ sent?: string }> };

export default async function PortalSupportPage({ searchParams }: Props) {
  const [{ user }, sp, company, offices, extras] = await Promise.all([getPortal(), searchParams, getCompany(), getOffices(), getHomeExtras()]);
  const ways = [
    { href: `tel:${BRAND.phoneIntl.replace(/\s/g, "")}`, label: "Call us", value: BRAND.phone, icon: "phone" },
    { href: `https://wa.me/${company.whatsapp.replace(/\D/g, "")}`, label: "WhatsApp", value: company.whatsapp, icon: "whatsapp", external: true },
    { href: `mailto:${company.email}`, label: "Email", value: company.email, icon: "mail" },
  ];

  return (
    <PortalShell title="Support" subtitle={extras.hours ? `We are available ${extras.hours}` : "We are happy to help"}>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {ways.map((w) => (
              <a
                key={w.label}
                href={w.href}
                target={w.external ? "_blank" : undefined}
                rel={w.external ? "noopener noreferrer" : undefined}
                className={`${CARD} flex items-center gap-4 p-5 hover:border-ink sm:flex-col sm:items-start`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
                  <Icon name={w.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold">{w.label}</span>
                  <span className="block truncate text-[15px] text-muted">{w.value}</span>
                </span>
              </a>
            ))}
          </div>

          <section className={`${CARD} p-6`}>
            <h2 className="text-[22px] font-semibold">Our offices</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {offices.map((o) => (
                <li key={o.id} className="rounded-[18px] bg-mist p-4 text-[15px]">
                  <p className="font-semibold">
                    {o.city}
                    {o.city === BRAND.city && <span className="ml-1 text-[13px] font-normal text-muted">· Head office</span>}
                  </p>
                  <p className="mt-1 text-body">{o.address}</p>
                  {o.phone && <p className="mt-1 text-muted">{o.phone}</p>}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section id="callback" className="scroll-mt-24 rounded-[24px] bg-[#f3ece2] p-6">
          <h2 className="text-[22px] font-semibold">Request a callback</h2>
          <p className="mt-1 text-[15px] text-body">Our team will call you on {user.phone ? <b>{user.phone}</b> : "your registered number"}.</p>
          {sp.sent === "callback" ? (
            <div className="mt-5">
              <SentNotice>Thank you. We will call you soon.</SentNotice>
            </div>
          ) : (
            <form action={portalRequestAction} className="mt-5 space-y-4">
              <input type="hidden" name="kind" value="callback" />
              <input type="hidden" name="return" value="/portal/support" />
              <label className="block text-[15px] font-semibold">
                Best time to call
                <select name="preferred_time" defaultValue="Any time" className="mt-1.5 w-full rounded-2xl border-[1.5px] border-line-strong bg-paper px-4 py-3 text-[16px] outline-none focus:border-ink">
                  <option>Any time</option>
                  <option>Morning (10am–1pm)</option>
                  <option>Afternoon (1pm–5pm)</option>
                  <option>Evening (5pm–8pm)</option>
                </select>
              </label>
              <button type="submit" className={`${BTN_INK} w-full`}>
                Call me back
              </button>
            </form>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
