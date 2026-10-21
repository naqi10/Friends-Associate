"use client";

import Link from "next/link";
import { useState } from "react";
import { HomeImage, Pill } from "@/components/home/HomeImage";
import { propertyPath } from "@/lib/property-slug";

export type HomeListing = {
  id: string;
  slug: string | null;
  title: string;
  locality: string;
  city: string;
  type: string;
  size: string;
  price: string;
  imagePath: string;
};

type Tab = "sale" | "rent";

/** "For sale / For rent" switch for the homepage properties section. Prices arrive pre-formatted from the server. */
export function PropertiesToggle({ sale, rent, initial }: { sale: HomeListing[]; rent: HomeListing[]; initial?: Tab }) {
  const [tab, setTab] = useState<Tab>(initial ?? (sale.length || !rent.length ? "sale" : "rent"));
  const items = tab === "sale" ? sale : rent;
  const tabs: { key: Tab; label: string }[] = [
    { key: "sale", label: "For sale" },
    { key: "rent", label: "For rent" },
  ];

  return (
    <>
      {/* Real links, so the switch works before JavaScript loads (slow mobile data); once loaded it switches instantly. */}
      <nav aria-label="Listing type" className="flex gap-1 rounded-full border border-ink p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/?listing=${t.key}#properties`}
            scroll={false}
            replace
            aria-current={tab === t.key ? "true" : undefined}
            onClick={(e) => {
              e.preventDefault();
              setTab(t.key);
            }}
            className={`flex min-h-11 items-center rounded-full px-5 text-sm font-semibold transition ${tab === t.key ? "bg-ink text-paper" : "text-ink hover:bg-mist"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* Grid sits in the section below the heading row; rendered via a portal-free sibling slot. */}
      <div className="order-last basis-full">
        {items.length === 0 ? (
          <p className="rounded-card border border-line p-8 text-center text-body">
            No properties {tab === "sale" ? "for sale" : "for rent"} right now.{" "}
            <Link href="/contact" className="font-semibold text-ink underline">
              Tell us what you need
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((l) => (
              <li key={l.id}>
                <Link
                  href={propertyPath(l)}
                  className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-paper transition-transform duration-200 hover:-translate-y-1"
                >
                  <HomeImage src={l.imagePath} alt={l.title} className="h-[220px]">
                    <div className="flex w-full items-start justify-between gap-2 p-3.5">
                      <Pill tone="dark">{tab === "sale" ? "For sale" : "For rent"}</Pill>
                      <Pill>{l.city}</Pill>
                    </div>
                  </HomeImage>
                  <div className="flex flex-1 flex-col gap-3.5 p-5">
                    <div className="flex flex-col gap-1">
                      <span className="text-[19px] font-semibold text-ink">{l.title}</span>
                      <span className="text-sm text-muted">{l.locality || l.city}</span>
                    </div>
                    <div className="flex gap-4 border-t border-line pt-3.5 text-[13px] text-body">
                      <span>{l.type}</span>
                      <span aria-hidden>·</span>
                      <span>{l.size}</span>
                    </div>
                    <div className="mt-auto flex items-baseline justify-between gap-3">
                      <span>
                        <span className="font-serif text-[30px] leading-none text-ink">{l.price}</span>
                        {tab === "rent" && <span className="text-[13px] text-muted"> / month</span>}
                      </span>
                      <span className="text-sm font-semibold text-ink">
                        Details <span aria-hidden>→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8 flex justify-center">
          <Link
            href={`/properties?tab=${tab === "sale" ? "buy" : "rent"}`}
            className="inline-flex min-h-12 items-center rounded-full border-[1.5px] border-ink px-7 text-[15px] font-semibold text-ink hover:bg-ink hover:text-paper"
          >
            View all properties <span aria-hidden className="ml-1">→</span>
          </Link>
        </div>
      </div>
    </>
  );
}
