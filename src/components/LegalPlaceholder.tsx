import Link from "next/link";
import { BRAND } from "@/lib/brand";

/** Placeholder until the client supplies the legal text; keeps footer links from 404-ing. */
export function LegalPlaceholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-[760px] px-6 py-24">
      <h1 className="font-serif text-[clamp(40px,5vw,64px)] leading-none text-ink">{title}</h1>
      <p className="mt-6 leading-relaxed text-body">
        Our full {title.toLowerCase()} will be published here shortly. For any question about how {BRAND.name} handles your information or
        our terms of service, please{" "}
        <Link href="/contact" className="font-semibold text-ink underline">
          contact us
        </Link>{" "}
        or call {BRAND.phone}.
      </p>
    </div>
  );
}
