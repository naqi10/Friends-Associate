import Link from "next/link";
import { LEAD_STATUSES, labelOf } from "@/lib/catalog";
import { searchAdmin } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Search" };

type Props = { searchParams: Promise<{ q?: string }> };

function Group({ title, children, count }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="admin-card overflow-hidden">
      <h2 className="border-b border-line px-6 py-4 font-semibold">
        {title} <span className="font-normal text-muted">({count})</span>
      </h2>
      <ul className="divide-y divide-line">{children}</ul>
    </section>
  );
}

function Row({ href, title, sub, tag }: { href: string; title: string; sub?: string; tag?: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-6 py-3.5 hover:bg-paper">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{title}</p>
          {sub && <p className="truncate text-sm text-muted">{sub}</p>}
        </div>
        {tag && <span className="shrink-0 rounded-full bg-mist px-2.5 py-1 text-xs text-body">{tag}</span>}
      </Link>
    </li>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const { can } = await requireStaff();
  const q = ((await searchParams).q ?? "").trim();
  const scope = {
    customers: can("users", "view"),
    units: can("properties", "update") || can("properties", "add"),
    projects: can("projects", "update") || can("projects", "add"),
    leads: can("leads", "view"),
    bookings: can("bookings", "view"),
  };
  const r = q.length >= 2 ? await searchAdmin(q, scope) : null;
  const total = r ? r.customers.length + r.units.length + r.projects.length + r.leads.length + r.bookings.length : 0;

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <form action="/admin/search" className="admin-card flex items-center gap-3 p-3 pl-5">
        <input
          name="q"
          type="search"
          defaultValue={q}
          autoFocus
          placeholder="Search customers, units, projects, leads…"
          aria-label="Search"
          className="min-w-0 flex-1 bg-transparent text-base outline-none"
        />
        <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
          Search
        </button>
      </form>

      {q.length > 0 && q.length < 2 && <p className="mt-6 text-sm text-muted">Type at least 2 letters.</p>}
      {r && total === 0 && <p className="mt-6 text-sm text-muted">Nothing found for &ldquo;{q}&rdquo;.</p>}
      {r && total > 0 && (
        <div className="mt-6 grid items-start gap-5 xl:grid-cols-2">
          <Group title="Customers" count={r.customers.length}>
            {r.customers.map((c) => (
              <Row key={c.id} href={`/admin/customers/${c.id}`} title={c.name} sub={`${c.email} · ${c.phone}`} tag={c.active ? undefined : "Disabled"} />
            ))}
          </Group>
          <Group title="Bookings" count={r.bookings.length}>
            {r.bookings.map((b) => (
              <Row key={b.id} href={`/admin/bookings/${b.id}`} title={b.property.title} sub={b.user.name} tag={b.status} />
            ))}
          </Group>
          <Group title="Units and listings" count={r.units.length}>
            {r.units.map((u) => (
              <Row key={u.id} href={`/admin/properties/${u.id}`} title={u.title} sub={u.city} tag={u.archivedAt ? "Archived" : u.status} />
            ))}
          </Group>
          <Group title="Projects" count={r.projects.length}>
            {r.projects.map((p) => (
              <Row key={p.id} href={`/admin/projects/${p.id}`} title={p.name} sub={p.city} tag={p.archivedAt ? "Archived" : undefined} />
            ))}
          </Group>
          <Group title="Leads" count={r.leads.length}>
            {r.leads.map((l) => (
              <Row key={l.id} href={`/sales/leads/${l.id}`} title={l.name} sub={l.phone} tag={labelOf(LEAD_STATUSES, l.status)} />
            ))}
          </Group>
        </div>
      )}
    </div>
  );
}
