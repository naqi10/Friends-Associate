import Link from "next/link";
import { FormError } from "@/components/FormError";
import { BulkActions } from "@/components/admin/BulkActions";
import { Icon } from "@/components/admin/shell/icons";
import { setArchivedAction } from "@/lib/actions/lifecycle";
import { bulkPropertyAction, setPropertyStatusAction, togglePropertyPublishedAction } from "@/lib/actions/inventory";
import { countArchivedProperties, getPropertyDirectory, type PropertyRow } from "@/lib/data";
import { formatPkr, formatPkrShort } from "@/lib/format";
import { requireStaffAny } from "@/lib/permissions";

export const metadata = { title: "Properties" };

type Search = { saved?: string; error?: string; archived?: string; l?: string; s?: string; q?: string; n?: string; skipped?: string };
type Props = { searchParams: Promise<Search> };

const TYPE_ICON: Record<string, string> = { Plot: "grid", House: "home", "Farm house": "home", Apartment: "building", Plaza: "building", Commercial: "building", Shop: "shop", Office: "office" };
const STATUS_CHIP: Record<string, string> = {
  Available: "bg-emerald-50 text-emerald-800",
  Booked: "bg-teal-50 text-teal-800",
  Sold: "bg-mist text-body",
};
const SAVED: Record<string, string> = {
  "1": "Saved.",
  deleted: "Listing deleted.",
  status: "Status changed.",
  published: "Listing published on the website.",
  unpublished: "Listing hidden from the website.",
};

/** Sale prices as the office writes them ("PKR 9.80 Cr", "PKR 98 Lac"); rents in full with "/mo". */
function price(p: PropertyRow) {
  if (p.listingType === "rent") return { main: `PKR ${p.pricePkr.toLocaleString("en-PK")}`, unit: "/mo" };
  return { main: p.pricePkr >= 10_000_000 ? formatPkr(p.pricePkr) : formatPkrShort(p.pricePkr).replace(" L", " Lac"), unit: "" };
}

export default async function AdminPropertiesPage({ searchParams }: Props) {
  const { can } = await requireStaffAny([
    ["properties", "update"],
    ["properties", "add"],
  ]);
  const sp = await searchParams;
  const archived = sp.archived === "1";
  const canEdit = can("properties", "update");
  const [all, archivedCount, activeAll] = await Promise.all([getPropertyDirectory({ archived }), countArchivedProperties(), archived ? getPropertyDirectory() : null]);
  const active = activeAll ?? all;
  const listing = sp.l === "sale" || sp.l === "rent" ? sp.l : undefined;
  const status = ["Available", "Booked", "Sold"].includes(sp.s ?? "") ? sp.s : undefined;
  const q = sp.q?.trim().toLowerCase();
  const rows = all.filter(
    (p) =>
      (!listing || p.listingType === listing) &&
      (!status || p.status === status) &&
      (!q || `${p.title} ${p.locality} ${p.city} ${p.project?.name ?? ""}`.toLowerCase().includes(q)),
  );

  // Inventory figures (active listings)
  const count = (st: string) => active.filter((p) => p.status === st).length;
  const forSale = active.filter((p) => p.listingType === "sale" && p.status === "Available");
  const forRent = active.filter((p) => p.listingType === "rent" && p.status === "Available");
  const inv = { total: active.length, available: count("Available"), booked: count("Booked"), sold: count("Sold") };
  const pct = (n: number) => (inv.total ? (n / inv.total) * 100 : 0);

  // Group: each project, then independent listings
  const groups = [
    ...[...new Map(rows.filter((p) => p.project).map((p) => [p.project!.id, p.project!])).values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((proj) => ({ key: proj.id, project: proj, items: rows.filter((p) => p.project?.id === proj.id) })),
    ...(rows.some((p) => !p.project) ? [{ key: "independent", project: null, items: rows.filter((p) => !p.project) }] : []),
  ];

  const href = (over: Partial<Record<"l" | "s" | "q" | "archived", string | undefined>> = {}) => {
    const p = new URLSearchParams();
    const m = { l: listing, s: status, q: sp.q || undefined, archived: archived ? "1" : undefined, ...over };
    for (const [k, v] of Object.entries(m)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin/properties?${s}` : "/admin/properties";
  };
  const returnTo = href();
  const notice =
    sp.saved === "bulk"
      ? `${sp.n ?? 0} listing${sp.n === "1" ? "" : "s"} updated.${Number(sp.skipped) > 0 ? ` ${sp.skipped} skipped because they have an active booking.` : ""}`
      : sp.saved
        ? SAVED[sp.saved]
        : undefined;

  const rowMenu = (p: PropertyRow) =>
    canEdit && !archived ? (
      <details className="relative">
        <summary aria-label={`More actions for ${p.title}`} className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-line hover:bg-mist">
          <Icon name="dots" />
        </summary>
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-line bg-white p-2 text-sm shadow-xl">
          {p.status !== "Booked" &&
            (["Available", "Sold"] as const)
              .filter((s) => s !== p.status)
              .map((s) => (
                <form key={s} action={setPropertyStatusAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="status" value={s} />
                  <input type="hidden" name="return" value={returnTo} />
                  <button type="submit" className="w-full rounded-xl px-3 py-2 text-left hover:bg-mist">
                    Mark as {s.toLowerCase()}
                  </button>
                </form>
              ))}
          <form action={togglePropertyPublishedAction}>
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="return" value={returnTo} />
            <button type="submit" className="w-full rounded-xl px-3 py-2 text-left hover:bg-mist">
              {p.published ? "Hide from website" : "Publish on website"}
            </button>
          </form>
          {p.published && (
            <Link href={`/properties/${p.id}`} target="_blank" className="block rounded-xl px-3 py-2 hover:bg-mist">
              View on website ↗
            </Link>
          )}
          {!(p.status === "Booked" && p.buyer) && (
            <form action={setArchivedAction}>
              <input type="hidden" name="kind" value="property" />
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="archived" value="1" />
              <button type="submit" className="w-full rounded-xl px-3 py-2 text-left text-red-700 hover:bg-mist">
                Archive
              </button>
            </form>
          )}
        </div>
      </details>
    ) : null;

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <div className="flex items-start justify-between gap-4 lg:items-end">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold tracking-tight lg:text-[44px]">Properties</h1>
          <p className="mt-1 text-[15px] text-muted">
            <span className="lg:hidden">
              {inv.total} listings · {inv.available} available · {inv.booked} booked
            </span>
            <span className="hidden lg:inline">Units for sale and rent. Available listings appear on the website.</span>
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          {can("properties", "add") && (
            <Link href="/admin/properties/import" className="hidden items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-white px-5 py-3 text-[15px] font-semibold hover:bg-mist lg:flex">
              <Icon name="upload" className="h-4.5 w-4.5" /> Import CSV
            </Link>
          )}
          {can("properties", "add") && (
            <Link href="/admin/properties/new" className="flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-paper hover:bg-body">
              <Icon name="plus" className="h-4.5 w-4.5" /> <span className="lg:hidden">Listing</span>
              <span className="hidden lg:inline">Add listing</span>
            </Link>
          )}
        </div>
      </div>
      {notice && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>}
      <FormError code={sp.error} />

      {/* Figures (computer) */}
      <div className="admin-card mt-8 hidden grid-cols-[1.7fr_1fr_1fr] divide-x divide-line lg:grid">
        <div className="p-7">
          <p className="flex justify-between text-[15px] text-muted">
            <span>Inventory · {inv.total} listings</span>
            <span>{inv.sold} sold</span>
          </p>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-line" aria-hidden>
            <span className="bg-ink" style={{ width: `${pct(inv.available)}%` }} />
            <span className="ml-0.5 bg-teal-700" style={{ width: `${pct(inv.booked)}%` }} />
            <span className="ml-0.5 bg-faint" style={{ width: `${pct(inv.sold)}%` }} />
          </div>
          <p className="mt-4 flex flex-wrap gap-x-6 text-[15px]">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-ink" /><strong>{inv.available}</strong> available</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-teal-700" /><strong>{inv.booked}</strong> booked</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-faint" /><strong>{inv.sold}</strong> sold</span>
          </p>
        </div>
        <div className="p-7">
          <p className="text-[15px] text-muted">Available for sale</p>
          <p className="mt-3 text-[clamp(26px,2.2vw,36px)] leading-none font-semibold whitespace-nowrap">{formatPkr(forSale.reduce((s, p) => s + p.pricePkr, 0))}</p>
          <p className="mt-3 text-[15px] text-muted">
            {forSale.length} unit{forSale.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="p-7">
          <p className="text-[15px] text-muted">Available for rent</p>
          <p className="mt-3 text-[clamp(26px,2.2vw,36px)] leading-none font-semibold">
            {forRent.length} unit{forRent.length === 1 ? "" : "s"}
          </p>
          <p className="mt-3 text-[15px] text-muted">{formatPkrShort(forRent.reduce((s, p) => s + p.pricePkr, 0)).replace(" L", " Lac")} / month total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <nav aria-label="Listing type" className="w-full lg:w-auto">
          <ul className="flex rounded-full bg-[#ebe9e4] p-1.5">
            {[
              { key: undefined, label: "All", n: all.length },
              { key: "sale", label: "For sale", m: "Sale", n: all.filter((p) => p.listingType === "sale").length },
              { key: "rent", label: "For rent", m: "Rent", n: all.filter((p) => p.listingType === "rent").length },
            ].map((t) => {
              const on = t.key === listing;
              return (
                <li key={t.label} className="flex-1 lg:flex-none">
                  <Link href={href({ l: t.key })} aria-current={on ? "page" : undefined} className={`flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[15px] ${on ? "bg-white font-semibold shadow-sm" : "text-body"}`}>
                    <span className="lg:hidden">{t.m ?? t.label}</span>
                    <span className="hidden lg:inline">{t.label}</span>
                    <span className="rounded-full bg-mist px-2 text-sm">{t.n}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <nav aria-label="Status" className="hidden lg:block">
          <ul className="flex rounded-full bg-[#ebe9e4] p-1.5">
            {[{ key: undefined, label: "Any status" }, { key: "Available", label: "Available" }, { key: "Booked", label: "Booked" }, ...(inv.sold ? [{ key: "Sold", label: "Sold" }] : [])].map((t) => (
              <li key={t.label}>
                <Link href={href({ s: t.key })} aria-current={t.key === status ? "page" : undefined} className={`block rounded-full px-4 py-2.5 text-[15px] ${t.key === status ? "bg-white font-semibold shadow-sm" : "text-body"}`}>
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form method="get" action="/admin/properties" className="w-full min-w-0 lg:w-auto lg:flex-1 lg:max-w-sm">
          {listing && <input type="hidden" name="l" value={listing} />}
          {status && <input type="hidden" name="s" value={status} />}
          {archived && <input type="hidden" name="archived" value="1" />}
          <label className="flex items-center gap-3 rounded-full border-[1.5px] border-line-strong bg-white px-5 py-3 focus-within:border-ink">
            <Icon name="search" className="h-5 w-5 text-muted" />
            <input name="q" type="search" defaultValue={sp.q} placeholder="Title, locality or project" aria-label="Search listings" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
          </label>
        </form>
        <nav aria-label="Active or archived" className="ml-auto hidden gap-5 text-[15px] lg:flex">
          <Link href={href({ archived: undefined })} className={`pb-1.5 ${!archived ? "border-b-2 border-ink font-semibold" : "text-muted"}`}>
            Active ({active.length})
          </Link>
          <Link href={href({ archived: "1" })} className={`pb-1.5 ${archived ? "border-b-2 border-ink font-semibold" : "text-muted"}`}>
            Archived ({archivedCount})
          </Link>
        </nav>
      </div>

      {rows.length === 0 ? (
        <p className="admin-card mt-6 px-6 py-12 text-center text-muted">{archived ? "No archived listings." : "No listings match."}</p>
      ) : (
        <>
          {/* Computer: grouped table */}
          <div className="mt-6 hidden lg:block">
            {canEdit && !archived && (
              <BulkActions
                formId="prop-bulk"
                action={bulkPropertyAction}
                returnTo={returnTo}
                noun="listings selected"
                groups={[
                  { label: "Status", options: [{ value: "status:Available", label: "Mark as available" }, { value: "status:Sold", label: "Mark as sold" }] },
                  { label: "Website", options: [{ value: "publish", label: "Publish" }, { value: "unpublish", label: "Hide from website" }] },
                  { label: "Archive", options: [{ value: "archive", label: "Archive" }] },
                ]}
              />
            )}
            <div className="admin-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[15px]">
                  <thead className="bg-[#faf9f7] text-muted">
                    <tr>
                      <th className="w-12 py-3.5 pl-6">{canEdit && !archived && <input type="checkbox" data-select-all="prop-bulk" aria-label="Select all" className="h-4.5 w-4.5" />}</th>
                      <th className="px-3 py-3.5 font-medium">Property</th>
                      <th className="px-3 py-3.5 font-medium">Listing</th>
                      <th className="hidden px-3 py-3.5 font-medium min-[1440px]:table-cell">Locality</th>
                      <th className="px-3 py-3.5 text-right font-medium">Price</th>
                      <th className="px-3 py-3.5 font-medium">Status</th>
                      <th className="py-3.5 pr-6 pl-3" />
                    </tr>
                  </thead>
                  {groups.map((g) => (
                    <tbody key={g.key}>
                      <tr className="border-t border-line bg-[#faf9f7]">
                        <td colSpan={7} className="px-6 py-3">
                          <span className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-3">
                              <Icon name={g.project ? "folder" : "pin"} className="h-5 w-5 text-muted" />
                              <strong className="font-semibold">{g.project ? g.project.name : "Independent listings"}</strong>
                              <span className="text-muted">
                                {g.items.length} listing{g.items.length === 1 ? "" : "s"} · {g.items.filter((p) => p.status === "Available").length} available
                                {!g.project && " · not part of a project"}
                              </span>
                            </span>
                            {g.project && can("projects", "update") && (
                              <Link href={`/admin/projects/${g.project.id}`} className="text-sm text-teal-800 underline underline-offset-4">
                                Open project →
                              </Link>
                            )}
                          </span>
                        </td>
                      </tr>
                      {g.items.map((p) => {
                        const pr = price(p);
                        return (
                          <tr key={p.id} className="border-t border-line hover:bg-[#fcfbf9]">
                            <td className="py-4 pl-6">{canEdit && !archived && <input type="checkbox" name="ids" value={p.id} form="prop-bulk" aria-label={`Select ${p.title}`} className="h-4.5 w-4.5" />}</td>
                            <td className="px-3 py-4">
                              <span className="flex items-center gap-4">
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mist">
                                  <Icon name={TYPE_ICON[p.type] ?? "building"} />
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold">
                                    {p.title}
                                    {!p.published && <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-xs font-normal text-muted">Hidden</span>}
                                  </span>
                                  <span className="block text-sm text-muted">
                                    {p.type}
                                    <span className="min-[1440px]:hidden"> · {p.locality || p.city}</span>
                                  </span>
                                </span>
                              </span>
                            </td>
                            <td className="px-3 py-4">
                              <span className={`rounded-lg px-2.5 py-1 text-sm ${p.listingType === "rent" ? "bg-violet-50 text-violet-800" : "bg-mist"}`}>{p.listingType === "rent" ? "Rent" : "Sale"}</span>
                            </td>
                            <td className="hidden px-3 py-4 min-[1440px]:table-cell">{p.locality || p.city}</td>
                            <td className="px-3 py-4 text-right whitespace-nowrap">
                              <strong className="font-semibold">{pr.main}</strong>
                              {pr.unit && <span className="text-sm text-muted"> {pr.unit}</span>}
                            </td>
                            <td className="px-3 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${STATUS_CHIP[p.status] ?? "bg-mist"}`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {p.status}
                              </span>
                              {p.buyer &&
                                (can("users", "view") ? (
                                  <Link href={`/admin/customers/${p.buyer.id}`} className="mt-1 block text-sm text-teal-800 underline underline-offset-2">
                                    {p.buyer.name}
                                  </Link>
                                ) : (
                                  <span className="mt-1 block text-sm text-muted">{p.buyer.name}</span>
                                ))}
                            </td>
                            <td className="py-4 pr-6 pl-3">
                              <span className="flex items-center justify-end gap-2">
                                {canEdit && (
                                  <Link href={`/admin/properties/${p.id}`} className="rounded-full border-[1.5px] border-line-strong px-4 py-2 text-sm font-semibold hover:bg-mist">
                                    {archived ? "Open" : "Edit"}
                                  </Link>
                                )}
                                {rowMenu(p)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  ))}
                </table>
              </div>
              <p className="flex justify-between border-t border-line px-6 py-4 text-[15px] text-muted">
                <span>
                  Showing {rows.length} of {all.length}
                </span>
                {canEdit && !archived && <span>Select rows to change status or archive in bulk</span>}
              </p>
            </div>
          </div>

          {/* Phone: list */}
          <ul className="-mx-4 mt-5 divide-y divide-line border-y border-line bg-white lg:hidden">
            {rows.map((p) => {
              const pr = price(p);
              return (
                <li key={p.id}>
                  <Link href={canEdit ? `/admin/properties/${p.id}` : `/properties/${p.id}`} className="flex gap-4 px-4 py-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-mist">
                      <Icon name={TYPE_ICON[p.type] ?? "building"} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-semibold">{p.title}</span>
                        <span className="shrink-0 text-right font-semibold">
                          {pr.main}
                          {pr.unit && <span className="block text-xs font-normal text-muted">per month</span>}
                        </span>
                      </span>
                      <span className="block text-sm text-muted">
                        {p.locality || p.city}
                        {p.project && ` · ${p.project.name}`}
                      </span>
                      <span className="mt-1.5 flex items-center gap-2 text-sm">
                        <span className={`rounded-full px-2.5 py-0.5 font-semibold ${STATUS_CHIP[p.status] ?? "bg-mist"}`}>{p.status}</span>
                        <span className="text-muted">{p.listingType === "rent" ? "For rent" : "For sale"}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
