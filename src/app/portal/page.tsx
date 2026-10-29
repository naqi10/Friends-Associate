import Link from "next/link";
import { Icon } from "@/components/admin/shell/icons";
import { PortalShell } from "@/components/PortalShell";
import { QuickQuestions, type QuickAnswer } from "@/components/portal/QuickQuestions";
import { BTN_DARK_OUTLINE, BTN_LIGHT, BTN_OUTLINE, CARD, DueBanner, DueChip, MoneyFacts, PropertyPhoto, ProgressBar, Ring } from "@/components/portal/ui";
import { BRAND } from "@/lib/brand";
import { documentsVisible } from "@/lib/document-access";
import { getDocumentsForUser, getNotifications } from "@/lib/data";
import { formatLacCr, formatLongDate } from "@/lib/format";
import { getPortal, nextInstalment, paidPercent } from "@/lib/portal";

const TEL = `tel:${BRAND.phoneIntl.replace(/\s/g, "")}`;

type Props = { searchParams: Promise<{ sent?: string }> };

export default async function PortalHomePage({ searchParams }: Props) {
  const { user, bookings, active, today } = await getPortal();
  const [sp, notices, allDocs] = await Promise.all([searchParams, getNotifications(user.id, 3), getDocumentsForUser(user.id)]);
  const firstName = user.name.split(" ")[0];
  // Documents show once the customer is confirmed: a booking with at least one payment received.
  const visible = documentsVisible(bookings);
  const docs = visible ? allDocs : [];
  const cancelled = bookings.filter((b) => !active.includes(b));

  // The most urgent instalment across all bookings goes in the banner.
  const due = active
    .map((b) => nextInstalment(b, today))
    .filter((i) => i && (i.overdue || i.days <= 10))
    .sort((a, b) => a!.date.localeCompare(b!.date))[0];

  const totalLeft = active.reduce((s, b) => s + b.outstanding_pkr, 0);
  const next = active.map((b) => ({ b, i: nextInstalment(b, today) })).filter((x) => x.i).sort((a, b) => a.i!.date.localeCompare(b.i!.date))[0];
  const answers: QuickAnswer[] = [
    {
      q: "How much do I still owe?",
      a:
        active.length === 0
          ? "You have no active booking with us."
          : totalLeft === 0
            ? "Nothing. Your property is fully paid. Thank you!"
            : `PKR ${totalLeft.toLocaleString("en-PK")} (${formatLacCr(totalLeft)}) is left to pay${active.length > 1 ? " across your properties" : ""}.` +
              active.map((b) => `\n• ${b.property.title}: paid ${formatLacCr(b.paid_pkr)} of ${formatLacCr(b.total_price_pkr)}`).join(""),
      href: "/portal/payments",
      link: "See payments",
    },
    {
      q: "When is my next payment?",
      a: next
        ? `PKR ${next.i!.amount.toLocaleString("en-PK")} ${next.i!.overdue ? "was due on" : "is due on"} ${formatLongDate(next.i!.date, true)}${active.length > 1 ? ` (${next.b.property.title})` : ""}.`
        : "You have no upcoming instalment.",
      href: "/portal/payments#how-to-pay",
      link: "How to pay",
    },
    {
      q: "Where are my documents?",
      a: !visible
        ? "Your documents appear here once your booking has its first payment."
        : docs.length
          ? `You have ${docs.length} document${docs.length === 1 ? "" : "s"} in your portal. Open Documents to download them any time.`
          : "Your documents will appear here as soon as our office uploads them. You will get a notification.",
      href: "/portal/documents",
      link: "Open documents",
    },
  ];

  return (
    <PortalShell>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <p className="hidden text-[13px] font-semibold tracking-[0.12em] text-amber-800 uppercase md:block">Customer portal</p>
          <h1 className="font-serif text-[40px] leading-[1.05] md:mt-2 md:text-[56px]">Assalam-o-Alaikum, {firstName}</h1>
          <p className="mt-2 text-[17px] text-muted md:text-[19px]">Here is everything about your home in one place.</p>
        </div>
        <p className="hidden text-[16px] text-muted md:block">{formatLongDate(today, true)}</p>
      </div>

      {due && (
        <div className="mt-6">
          <DueBanner inst={due} />
        </div>
      )}

      {/* Design / naqsha client: no property, so their files are the main thing on the page. */}
      {bookings.length === 0 && (
        <section aria-labelledby="your-files" className={`${CARD} mt-6 p-2 sm:p-3`}>
          <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2">
            <h2 id="your-files" className="text-[22px] font-semibold">
              Your files
            </h2>
            <Link href="/portal/documents" className="text-[15px] text-teal-800 underline underline-offset-4">
              All files
            </Link>
          </div>
          {docs.length === 0 ? (
            <p className="m-2 rounded-[18px] bg-mist px-5 py-10 text-center text-[16px] text-muted">
              Your drawings and documents will appear here as soon as our office uploads them. You will get a notification.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {docs.slice(0, 6).map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-3 py-4 sm:gap-4 sm:px-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mist">
                    <Icon name="file" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-semibold">{d.name}</p>
                    <p className="text-[14px] text-muted">{formatLongDate(d.issued_on)}</p>
                  </div>
                  {d.storage_path && (
                    <a
                      href={`/api/documents/${d.id}/download`}
                      aria-label={`Download ${d.name}`}
                      className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-[15px] font-semibold text-paper hover:bg-body"
                    >
                      <Icon name="download" className="h-5 w-5" />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {bookings.length > 0 && active.length === 0 && (
        <div className={`${CARD} mt-6 p-8 text-center`}>
          <Icon name="building" className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-3 text-[18px] font-semibold">No property on your account yet</p>
          <p className="mt-1 text-[15px] text-muted">Once your booking is confirmed by our office it will show here, with payments and progress.</p>
          <a href={TEL} className={`${BTN_OUTLINE} mt-5`}>
            Call {BRAND.phone}
          </a>
        </div>
      )}

      {active.map((b) => {
        const inst = nextInstalment(b, today);
        const pct = paidPercent(b);
        const place = [b.project.name, b.property.locality || b.property.city].filter(Boolean).join(" · ");
        return (
          <div key={b.id} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
            <article className={`${CARD} overflow-hidden md:grid md:grid-cols-[minmax(220px,40%)_1fr]`}>
              <PropertyPhoto src={b.property.imagePath} alt={b.property.title} badge="Booked · yours" className="h-56 md:h-auto md:min-h-[300px]" />
              <div className="p-6 md:p-8">
                <p className="text-[15px] text-muted">{place}</p>
                <h2 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight md:text-[32px]">{b.property.title}</h2>
                <div className="mt-6 flex items-center gap-6 sm:gap-8">
                  <Ring percent={pct} />
                  <MoneyFacts paid={b.paid_pkr} remaining={b.outstanding_pkr} total={b.total_price_pkr} className="grid flex-1 gap-3" />
                </div>
                <div className="mt-6 border-t border-line pt-5">
                  <ProgressBar label="Construction progress" percent={b.project.progress_percent} />
                  <div className="mt-3 flex items-center justify-between gap-3 text-[15px]">
                    <span className="hidden text-muted sm:inline">{b.project.name}</span>
                    <Link href="/portal/progress" className="font-medium text-teal-800 underline underline-offset-4">
                      See site updates →
                    </Link>
                  </div>
                </div>
              </div>
            </article>

            <section aria-label="Next instalment" className="flex flex-col rounded-[24px] bg-ink p-6 text-paper md:p-8">
              {inst ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[16px] text-faint">Next instalment</p>
                    <DueChip inst={inst} />
                  </div>
                  <p className="mt-3 text-[40px] leading-none font-semibold tracking-tight md:text-[46px]">PKR {inst.amount.toLocaleString("en-PK")}</p>
                  <p className="mt-3 text-[16px] text-faint">
                    {inst.overdue ? "Was due" : "Due on"} {formatLongDate(inst.date, true)}
                  </p>
                  <div className="mt-5 hidden rounded-[18px] bg-white/[0.06] p-4 text-[15px] leading-relaxed md:block">
                    <p className="font-semibold">Ways to pay</p>
                    <p className="mt-1 text-faint">Cash or cheque at any of our offices. You get a receipt for every payment.</p>
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
                    <Link href="/portal/payments#how-to-pay" className={BTN_LIGHT}>
                      How to pay
                    </Link>
                    <Link href="/portal/payments?paid=1#send-receipt" className={BTN_DARK_OUTLINE}>
                      I&rsquo;ve paid
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[16px] text-faint">Payments</p>
                  <p className="mt-3 text-[34px] leading-tight font-semibold">{b.outstanding_pkr <= 0 ? "Fully paid" : "No instalment scheduled"}</p>
                  <p className="mt-2 text-[16px] text-faint">{b.outstanding_pkr <= 0 ? "Thank you. Every payment is in your history." : "Our office will share your next date."}</p>
                  <div className="mt-auto pt-6">
                    <Link href="/portal/payments#history" className={`${BTN_LIGHT} w-full`}>
                      Payment history
                    </Link>
                  </div>
                </>
              )}
            </section>
          </div>
        );
      })}

      {cancelled.length > 0 && (
        <p className="mt-4 text-[15px] text-muted">
          Booking cancelled: {cancelled.map((b) => b.property.title).join(", ")}. Past payments stay in{" "}
          <Link href="/portal/payments" className="underline">
            Payments
          </Link>
          .
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className={`${CARD} flex flex-col p-6`}>
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-mist">
              <Icon name="file" className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-[20px] font-semibold">My documents</h2>
              <p className="text-[15px] text-muted">{visible ? `${docs.length} document${docs.length === 1 ? "" : "s"} · ready to download` : "Coming after your first payment"}</p>
            </div>
          </div>
          <p className="mt-4 text-[16px] leading-relaxed text-body">
            {visible
              ? "Your agreements, letters and payment slips. New ones appear here with a notification, ready to download."
              : "Once your booking has its first payment, every document our office uploads for you appears here, ready to download."}
          </p>
          <div className="mt-auto pt-6">
            <Link href="/portal/documents" className={`${BTN_OUTLINE} w-full`}>
              Open documents
            </Link>
          </div>
        </section>

        <section className={`${CARD} p-6`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[20px] font-semibold">Latest for you</h2>
            <Link href="/portal/notifications" className="text-[15px] text-teal-800 underline underline-offset-4">
              All notifications
            </Link>
          </div>
          {notices.length === 0 ? (
            <p className="mt-4 text-[15px] text-muted">Nothing new. Payment reminders, receipts and site updates will appear here.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {notices.map((n) => (
                <li key={n.id} className="flex gap-3 py-4">
                  <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${n.readAt ? "bg-line-strong" : "bg-red-600"}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[16px] font-semibold">{n.title}</p>
                    {n.message && <p className="line-clamp-2 text-[15px] text-muted">{n.message}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[24px] bg-[#f3ece2] p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink font-serif text-[28px] text-paper ring-2 ring-amber-600 ring-offset-2 ring-offset-[#f3ece2]">
              F
            </span>
            <div>
              <h2 className="text-[20px] font-semibold">Quick questions</h2>
              <p className="text-[15px] text-muted">Tap one for an instant answer</p>
            </div>
          </div>
          <div className="mt-5">
            <QuickQuestions answers={answers} returnTo="/portal" callbackSent={sp.sent === "callback"} />
          </div>
          <p className="mt-5 text-[15px] text-muted">
            Or call{" "}
            <a href={TEL} className="font-semibold text-ink underline underline-offset-4">
              {BRAND.phone}
            </a>
          </p>
        </section>
      </div>
    </PortalShell>
  );
}
