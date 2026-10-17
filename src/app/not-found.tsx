import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Page not found", robots: { index: false } };

/** Friendly 404 for every route (PROJECT_SPEC §65): no technical details, clear ways forward. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Page not found</p>
      <h1 className="mt-3 font-serif text-4xl text-ink">We could not find that page.</h1>
      <p className="mt-4 text-body">
        The link may be old or mistyped, or the page may no longer be available. If you were looking for your own records, please log in again.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm font-semibold">
        <Link href="/" className="rounded-full bg-ink px-5 py-3 text-paper">
          Go to homepage
        </Link>
        <Link href="/contact" className="rounded-full border-[1.5px] border-ink px-5 py-3 text-ink">
          Contact us
        </Link>
      </div>
      <p className="mt-8 text-sm text-muted">Need help now? Call {BRAND.phone}.</p>
    </div>
  );
}
