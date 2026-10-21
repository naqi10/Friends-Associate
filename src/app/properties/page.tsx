import Link from "next/link";
import type { Metadata } from "next";
import { PropertyCard } from "@/components/public/Cards";
import { FormStatus, Honeypot } from "@/components/public/EnquiryForms";
import { sellPropertyAction } from "@/lib/actions/leads";
import { BUDGET_BANDS, PROPERTY_TYPES, SIZE_BANDS, type ListingType } from "@/lib/catalog";
import { CITIES } from "@/lib/constants";
import { getPageContent, getPropertiesWithProject, getPropertyLocalities } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Properties — buy, rent or sell",
  description:
    "Houses, plots, apartments, shops and offices for sale and rent in Rahim Yar Khan, Lahore and Karachi. Filter by budget, size and area, or list your own.",
  path: "/properties",
});

type Tab = "buy" | "rent" | "sell";
type Search = { tab?: string; type?: string; city?: string; locality?: string; budget?: string; size?: string; all?: string; status?: string; sent?: string; error?: string };
type Props = { searchParams: Promise<Search> };

const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: "buy", label: "Buy", hint: "Properties for sale" },
  { key: "rent", label: "Rent", hint: "Monthly rentals" },
  { key: "sell", label: "Sell", hint: "List your property" },
];

/** Accept only known values so query strings cannot inject arbitrary filters. */
function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export default async function PropertiesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tab: Tab = pick(sp.tab, ["buy", "rent", "sell"] as const) ?? "buy";
  const page = await getPageContent("page.properties");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-serif text-5xl leading-none text-balance">{page.title}</h1>
      {page.intro && <p className="mt-3 max-w-2xl text-stone-600">{page.intro}</p>}
      <nav aria-label="Property listings" className="mt-6 flex gap-2 border-b border-stone-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/properties?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === t.key ? "border-teal-700 text-teal-800" : "border-transparent text-stone-500 hover:text-stone-800"}`}
          >
            {t.label}
            <span className="ml-2 hidden text-xs font-normal text-stone-400 sm:inline">{t.hint}</span>
          </Link>
        ))}
      </nav>
      {tab === "sell" ? <SellPanel sent={sp.sent} error={sp.error} /> : <Listings listingType={tab === "rent" ? "rent" : "sale"} sp={sp} tab={tab} />}
    </div>
  );
}

async function Listings({ listingType, sp, tab }: { listingType: ListingType; sp: Search; tab: Tab }) {
  const localities = await getPropertyLocalities();
  const budget = BUDGET_BANDS[listingType].find((b) => b.key === sp.budget);
  const size = SIZE_BANDS.find((s) => s.key === sp.size);
  const filter = {
    type: pick(sp.type, PROPERTY_TYPES),
    city: pick(sp.city, CITIES),
    locality: localities.includes(sp.locality ?? "") ? sp.locality : undefined,
  };
  // Available only unless the visitor asks to include booked/sold units (old ?status=Available links still work).
  const includeAll = sp.all === "1";
  const properties = await getPropertiesWithProject({
    ...filter,
    listingType,
    status: includeAll ? undefined : "Available",
    minPrice: budget?.min,
    maxPrice: budget?.max,
    minMarla: size && "min" in size ? size.min : undefined,
    maxMarla: size && "max" in size ? size.max : undefined,
    publishedOnly: true,
  });
  const active = Object.values(filter).some(Boolean) || !!budget || !!size || includeAll;
  const select = "rounded-md border border-stone-300 px-3 py-2";

  return (
    <>
      <form method="get" className="mt-6 grid gap-3 rounded-xl border border-stone-200 bg-white p-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <input type="hidden" name="tab" value={tab} />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-500">Budget</span>
          <select name="budget" defaultValue={budget?.key ?? ""} className={select}>
            <option value="">Any</option>
            {BUDGET_BANDS[listingType].map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-500">Size</span>
          <select name="size" defaultValue={size?.key ?? ""} className={select}>
            <option value="">Any</option>
            {SIZE_BANDS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-500">Locality</span>
          <select name="locality" defaultValue={filter.locality ?? ""} className={select}>
            <option value="">Any</option>
            {localities.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-500">Type</span>
          <select name="type" defaultValue={filter.type ?? ""} className={select}>
            <option value="">Any</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-500">City</span>
          <select name="city" defaultValue={filter.city ?? ""} className={select}>
            <option value="">Any</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-xs text-stone-600">
            <input type="checkbox" name="all" value="1" defaultChecked={includeAll} className="h-4 w-4" />
            Include booked/sold
          </label>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-md bg-teal-800 px-3 py-2 font-medium text-white hover:bg-teal-900">
              Search
            </button>
            {active && (
              <Link href={`/properties?tab=${tab}`} className="rounded-md border px-3 py-2 text-stone-600 hover:bg-stone-50">
                Clear
              </Link>
            )}
          </div>
        </div>
      </form>

      <p className="mt-4 text-sm text-stone-500" aria-live="polite">
        {properties.length} {properties.length === 1 ? "property" : "properties"} {listingType === "rent" ? "for rent" : "for sale"}
      </p>
      {properties.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-600">
          <p>No available properties found for these filters.</p>
          <Link href="/contact#enquiry" className="mt-3 inline-block font-medium text-teal-800 underline">
            Tell us what you need and we will find it for you
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </>
  );
}

async function SellPanel({ sent, error }: { sent?: string; error?: string }) {
  const sell = await getPageContent("page.properties.sell");
  const input = "mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm";
  return (
    <section id="enquiry" className="mt-8 grid scroll-mt-24 gap-10 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <h2 className="font-serif text-4xl leading-tight text-balance">{sell.title}</h2>
        {sell.intro && <p className="mt-3 text-stone-600">{sell.intro}</p>}
        <ul className="mt-6 space-y-2 text-sm text-stone-700">
          <li>✓ Free initial consultation</li>
          <li>✓ Verified buyers and tenants</li>
          <li>✓ Help with documents and transfer</li>
        </ul>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <FormStatus sent={sent} error={error} sentText="Thank you — our property team will contact you shortly." />
        <form action={sellPropertyAction} className="relative mt-2 grid gap-3 sm:grid-cols-2">
          <Honeypot />
          <input type="hidden" name="returnTo" value="/properties?tab=sell" />
          <label className="text-sm">
            I want to
            <select name="purpose" className={input}>
              <option value="sell">Sell</option>
              <option value="rent">Rent out</option>
            </select>
          </label>
          <label className="text-sm">
            Property type
            <select name="property_type" required className={input}>
              {PROPERTY_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Size
            <input name="size" required maxLength={60} placeholder="e.g. 10 Marla" className={input} />
          </label>
          <label className="text-sm">
            Locality
            <input name="locality" required maxLength={120} placeholder="e.g. Model Town" className={input} />
          </label>
          <label className="text-sm">
            City
            <input name="city" maxLength={60} defaultValue="Rahim Yar Khan" className={input} />
          </label>
          <label className="text-sm">
            Expected price (optional)
            <input name="expected_price" maxLength={60} placeholder="e.g. 95 lakh" className={input} />
          </label>
          <label className="text-sm">
            Your name
            <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={input} />
          </label>
          <label className="text-sm">
            Phone / WhatsApp
            <input name="phone" type="tel" required pattern="\+?[0-9][0-9\s\-]{6,18}" placeholder="03xx-xxxxxxx" autoComplete="tel" className={input} />
          </label>
          <label className="text-sm sm:col-span-2">
            Anything else (optional)
            <textarea name="message" rows={3} maxLength={1000} className={input} />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400">
              Send details
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
