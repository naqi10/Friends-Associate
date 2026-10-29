import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { CARD, MoneyFacts, PropertyPhoto, ProgressBar, Ring } from "@/components/portal/ui";
import { formatLongDate } from "@/lib/format";
import { permissionsFor } from "@/lib/permissions";
import { getPortal, paidPercent } from "@/lib/portal";

export const metadata = { title: "My property", robots: { index: false } };

export default async function PortalPropertiesPage() {
  const { user, bookings, active } = await getPortal();
  const can = await permissionsFor(user);
  if (!can("bookings", "view")) {
    return (
      <PortalShell title="My property">
        <p className="rounded-2xl bg-mist p-5 text-[16px]">This section is not available for your account. Please contact Friends Associates if you need access.</p>
      </PortalShell>
    );
  }

  return (
    <PortalShell title={bookings.length > 1 ? "My properties" : "My property"}>
      {bookings.length === 0 && <p className="rounded-2xl bg-mist p-5 text-[16px]">No property on your account yet. It will appear here once your booking is confirmed.</p>}
      <div className="space-y-6">
        {bookings.map((b) => {
          const cancelled = !active.includes(b);
          const facts: [string, string][] = [
            ["Project", b.project.name],
            ["Location", [b.property.locality, b.property.city].filter(Boolean).join(", ")],
            ["Type", b.property.type],
            ["Size", b.property.size],
            ["Booked on", formatLongDate(b.booked_on)],
            ["Booking status", b.status],
          ];
          return (
            <article key={b.id} className={`${CARD} overflow-hidden lg:grid lg:grid-cols-[420px_1fr]`}>
              <PropertyPhoto src={b.property.imagePath} alt={b.property.title} badge={cancelled ? "Booking cancelled" : "Booked · yours"} className="h-60 lg:h-auto lg:min-h-[360px]" />
              <div className="p-6 md:p-8">
                <h2 className="text-[28px] leading-tight font-semibold tracking-tight md:text-[32px]">{b.property.title}</h2>
                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  {facts
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-[14px] text-muted">{k}</dt>
                        <dd className="text-[17px] font-semibold">{v}</dd>
                      </div>
                    ))}
                </dl>
                {!cancelled && (
                  <>
                    <div className="mt-6 flex items-center gap-6 border-t border-line pt-6">
                      <Ring percent={paidPercent(b)} size={120} />
                      <MoneyFacts paid={b.paid_pkr} remaining={b.outstanding_pkr} total={b.total_price_pkr} className="grid flex-1 gap-3" />
                    </div>
                    <ProgressBar label="Construction progress" percent={b.project.progress_percent} className="mt-6" />
                  </>
                )}
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[15px] font-medium">
                  <Link href={`/portal/payments#b-${b.id}`} className="text-teal-800 underline underline-offset-4">
                    Payments →
                  </Link>
                  {!cancelled && (
                    <Link href="/portal/progress" className="text-teal-800 underline underline-offset-4">
                      Site updates →
                    </Link>
                  )}
                  <Link href={`/projects/${b.project.slug}`} className="text-teal-800 underline underline-offset-4">
                    About the project →
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </PortalShell>
  );
}
