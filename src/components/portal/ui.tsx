import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/admin/shell/icons";
import { formatLacCr, formatLongDate } from "@/lib/format";
import { focalPosition, hasRealImage } from "@/lib/media";
import type { Instalment } from "@/lib/portal";

/** White card used across the portal. */
export const CARD = "rounded-[24px] border border-line bg-paper";

export const BTN_LIGHT = "inline-flex min-h-12 items-center justify-center rounded-full bg-paper px-6 text-[16px] font-semibold text-ink hover:bg-mist";
export const BTN_DARK_OUTLINE = "inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-6 text-[16px] font-medium text-paper hover:bg-white/10";
export const BTN_INK = "inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-6 text-[16px] font-semibold text-paper hover:bg-body";
export const BTN_OUTLINE = "inline-flex min-h-12 items-center justify-center rounded-full border-[1.5px] border-line-strong bg-paper px-6 text-[16px] font-medium text-ink hover:bg-mist";

/** The "30% paid" ring. */
export function Ring({ percent, size = 136 }: { percent: number; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-mist)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#0f6b6b"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${(Math.max(0, Math.min(100, percent)) / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[30px] leading-none font-semibold tracking-tight">{percent}%</span>
        <span className="mt-1 text-[13px] text-muted">paid</span>
      </div>
    </div>
  );
}

/** Property photo, or a calm placeholder with a house icon until one is uploaded. */
export function PropertyPhoto({ src, alt, badge, className = "" }: { src: string; alt: string; badge?: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-[#ece6dc] ${className}`}>
      {hasRealImage(src) ? (
        <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 420px, 100vw" className="object-cover" style={{ objectPosition: focalPosition(src) }} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-amber-800">
          <Icon name="home" className="h-12 w-12" />
          <span className="mt-2 text-[14px]">Photo coming soon</span>
        </div>
      )}
      {badge && <span className="absolute top-4 left-4 rounded-full bg-ink px-3 py-1 text-[13px] font-semibold text-paper">{badge}</span>}
    </div>
  );
}

/** "7 days past due" / "Due in 5 days" / "Due today". */
export function dueLabel(i: Instalment) {
  if (i.days === 0) return "Due today";
  return i.overdue ? `${i.days} ${i.days === 1 ? "day" : "days"} past due` : `Due in ${i.days} ${i.days === 1 ? "day" : "days"}`;
}

export function DueChip({ inst }: { inst: Instalment }) {
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold ${inst.overdue ? "bg-amber-900/60 text-amber-200" : "bg-white/10 text-paper"}`}>
      {dueLabel(inst)}
    </span>
  );
}

/** Green confirmation after a request was sent. */
export function SentNotice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-[15px] text-emerald-900 ring-1 ring-emerald-200">
      <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Paid / Remaining / Total, as on the home and property pages. */
export function MoneyFacts({ paid, remaining, total, className = "" }: { paid: number; remaining: number; total: number; className?: string }) {
  const rows: [string, number][] = [
    ["Paid", paid],
    ["Remaining", remaining],
    ["Total", total],
  ];
  return (
    <dl className={className}>
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-3">
          <dt className="text-[15px] text-muted">{k}</dt>
          <dd className="text-[20px] font-semibold tracking-tight whitespace-nowrap sm:text-[22px]">{formatLacCr(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({ percent, label, className = "" }: { percent: number; label: string; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between text-[16px]">
        <span className="font-semibold">{label}</span>
        <span className="font-semibold">{percent}%</span>
      </div>
      <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-mist" role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-ink" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/** The amber "your instalment is due" strip at the top of the home page. */
export function DueBanner({ inst }: { inst: Instalment }) {
  const amount = `PKR ${inst.amount.toLocaleString("en-PK")}`;
  const when = formatLongDate(inst.date).replace(/ \d{4}$/, "");
  const head = inst.overdue ? `Your instalment of ${amount} was due on ${when}` : `Your next instalment of ${amount} is due on ${when}`;
  return (
    <div className="rounded-[20px] border border-amber-200 bg-amber-50/70">
      {/* Phones: one tappable line. */}
      <Link href="/portal/payments" className="flex items-center gap-3 p-4 md:hidden">
        <Icon name="clock" className="h-6 w-6 shrink-0 text-amber-800" />
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold text-amber-900">
            {inst.overdue ? "Instalment was due" : "Instalment due"} {when}
          </span>
          <span className="block text-[15px] text-amber-800">{amount} · see how to pay</span>
        </span>
        <Icon name="chevron" className="h-5 w-5 shrink-0 text-amber-900" />
      </Link>
      <div className="hidden items-center gap-5 px-6 py-5 md:flex">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <Icon name="clock" className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[18px] font-semibold text-amber-900">{head}</p>
          <p className="text-[15px] text-amber-800">If you&rsquo;ve already paid, send us the receipt and we&rsquo;ll update your account.</p>
        </div>
        <Link href="/portal/payments#how-to-pay" className={BTN_INK}>
          How to pay
        </Link>
        <Link href="/portal/payments#send-receipt" className={BTN_OUTLINE}>
          I&rsquo;ve paid
        </Link>
      </div>
    </div>
  );
}
