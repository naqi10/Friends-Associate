import Link from "next/link";
import { FormError } from "@/components/FormError";
import { Icon } from "@/components/admin/shell/icons";
import { setArchivedAction } from "@/lib/actions/lifecycle";
import { duplicateProjectAction, toggleProjectFlagAction } from "@/lib/actions/inventory";
import { DIVISIONS, PROJECT_CATEGORIES, labelOf } from "@/lib/catalog";
import { countArchivedProjects, getProjectDirectory, type ProjectCard } from "@/lib/data";
import { requireStaffAny } from "@/lib/permissions";

export const metadata = { title: "Projects" };

type Props = { searchParams: Promise<{ saved?: string; error?: string; archived?: string; d?: string; q?: string }> };

const SAVED: Record<string, string> = {
  "1": "Saved.",
  deleted: "Project deleted.",
  "featured-on": "Featured on the home page (and published).",
  "featured-off": "Removed from the home page.",
  "published-on": "Published on the website.",
  "published-off": "Hidden from the website.",
};

const DIVISION_CHIP: Record<string, string> = {
  construction: "bg-teal-50 text-teal-800",
  architecture: "bg-violet-50 text-violet-800",
};

export default async function AdminProjectsPage({ searchParams }: Props) {
  const { can } = await requireStaffAny([
    ["projects", "update"],
    ["projects", "add"],
  ]);
  const sp = await searchParams;
  const archived = sp.archived === "1";
  const [all, archivedCount, activeAll] = await Promise.all([getProjectDirectory({ archived }), countArchivedProjects(), archived ? getProjectDirectory() : null]);
  const active = activeAll ?? all;
  const division = DIVISIONS.some((d) => d.key === sp.d) ? sp.d : undefined;
  const q = sp.q?.trim().toLowerCase();
  const list = all.filter((p) => (!division || p.division === division) && (!q || `${p.name} ${p.slug} ${labelOf(PROJECT_CATEGORIES, p.category)}`.toLowerCase().includes(q)));
  const withUnits = list.filter((p) => p.units.total > 0);
  const services = list.filter((p) => p.units.total === 0);
  const avg = active.length ? Math.round(active.reduce((s, p) => s + p.progress, 0) / active.length) : 0;
  const canEdit = can("projects", "update");
  const href = (over: { d?: string | null; archived?: boolean; q?: string | null } = {}) => {
    const p = new URLSearchParams();
    const d = over.d === null ? undefined : (over.d ?? division);
    if (d) p.set("d", d);
    const qq = over.q === null ? undefined : (over.q ?? sp.q);
    if (qq) p.set("q", qq);
    if (over.archived ?? archived) p.set("archived", "1");
    const s = p.toString();
    return s ? `/admin/projects?${s}` : "/admin/projects";
  };
  const returnTo = href();

  const card = (p: ProjectCard) => {
    const done = p.progress >= 100;
    return (
      <li key={p.id} className="admin-card flex flex-col p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${DIVISION_CHIP[p.division] ?? "bg-mist"}`}>{labelOf(DIVISIONS, p.division)}</span>
            {p.featured && <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">★ Featured</span>}
            {!p.published && <span className="rounded-full bg-mist px-3 py-1 text-sm text-muted">Hidden</span>}
          </div>
          {(canEdit || can("projects", "add")) && !archived && (
            <details className="relative">
              <summary aria-label={`More actions for ${p.name}`} className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-muted hover:bg-mist">
                <Icon name="more" />
              </summary>
              <div className="absolute right-0 z-20 mt-1 w-60 rounded-2xl border border-line bg-white p-2 text-sm shadow-xl">
                {canEdit && (
                  <>
                    <form action={toggleProjectFlagAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="flag" value="featured" />
                      <input type="hidden" name="return" value={returnTo} />
                      <button type="submit" className="w-full rounded-xl px-3 py-2 text-left hover:bg-mist">
                        {p.featured ? "Remove from home page" : "Feature on home page"}
                      </button>
                    </form>
                    <form action={toggleProjectFlagAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="flag" value="published" />
                      <input type="hidden" name="return" value={returnTo} />
                      <button type="submit" className="w-full rounded-xl px-3 py-2 text-left hover:bg-mist">
                        {p.published ? "Hide from website" : "Publish on website"}
                      </button>
                    </form>
                  </>
                )}
                {can("projects", "add") && (
                  <form action={duplicateProjectAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="w-full rounded-xl px-3 py-2 text-left hover:bg-mist">
                      Duplicate project
                    </button>
                  </form>
                )}
                {can("progress", "view") && (
                  <Link href={`/pm?p=${p.id}`} className="block rounded-xl px-3 py-2 hover:bg-mist">
                    Update progress
                  </Link>
                )}
                {canEdit && (
                  <form action={setArchivedAction}>
                    <input type="hidden" name="kind" value="project" />
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="archived" value="1" />
                    <button type="submit" className="w-full rounded-xl px-3 py-2 text-left text-red-700 hover:bg-mist">
                      Archive
                    </button>
                  </form>
                )}
              </div>
            </details>
          )}
        </div>
        <h3 className="mt-5 text-[19px] font-semibold">{p.name}</h3>
        <p className="text-[15px] text-muted">{labelOf(PROJECT_CATEGORIES, p.category)}</p>
        <p className="mt-0.5 truncate font-mono text-xs text-muted">/projects/{p.slug}</p>
        <p className="mt-4 flex justify-between text-sm">
          <span className="text-muted">{done ? "Completed" : "Progress"}</span>
          <span className="font-semibold">{p.progress}%</span>
        </p>
        <span aria-hidden className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line">
          <span className={`block h-full rounded-full ${done ? "bg-emerald-700" : "bg-ink"}`} style={{ width: `${p.progress}%` }} />
        </span>
        {p.units.total > 0 && (
          <p className="mt-4 flex flex-wrap gap-2 text-sm">
            {[`${p.units.total} unit${p.units.total === 1 ? "" : "s"}`, `${p.units.available} available`, `${p.units.booked} booked`, ...(p.units.sold ? [`${p.units.sold} sold`] : [])].map((c) => (
              <span key={c} className="rounded-xl border border-line px-3 py-1.5">
                {c}
              </span>
            ))}
          </p>
        )}
        <div className="mt-auto flex items-center gap-3 pt-5">
          {archived ? (
            <Link href={`/admin/projects/${p.id}`} className="flex-1 rounded-full border-[1.5px] border-line-strong py-2.5 text-center text-[15px] font-semibold hover:bg-mist">
              Open to restore
            </Link>
          ) : (
            <>
              {canEdit && (
                <Link href={`/admin/projects/${p.id}`} className="flex-1 rounded-full border-[1.5px] border-line-strong py-2.5 text-center text-[15px] font-semibold hover:bg-mist">
                  Edit project
                </Link>
              )}
              {p.published && (
                <Link href={`/projects/${p.slug}`} target="_blank" className="flex items-center gap-1.5 px-3 text-[15px] text-body hover:text-ink">
                  <Icon name="external" className="h-4.5 w-4.5" /> View page
                </Link>
              )}
            </>
          )}
        </div>
      </li>
    );
  };

  const mobileRow = (p: ProjectCard) => (
    <li key={p.id}>
      <Link href={canEdit ? `/admin/projects/${p.id}` : `/projects/${p.slug}`} className="block px-4 py-4">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-lg font-semibold">{p.name}</span>
          <span className="shrink-0 text-lg font-semibold">{p.progress}%</span>
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-[15px] text-muted">
          <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${DIVISION_CHIP[p.division] ?? "bg-mist"}`}>{labelOf(DIVISIONS, p.division)}</span>
          {labelOf(PROJECT_CATEGORIES, p.category)}
          {p.featured && <span className="font-semibold text-amber-800">· Featured</span>}
        </span>
        <span aria-hidden className="mt-3 block h-1.5 overflow-hidden rounded-full bg-line">
          <span className={`block h-full rounded-full ${p.progress >= 100 ? "bg-emerald-700" : "bg-ink"}`} style={{ width: `${p.progress}%` }} />
        </span>
        {p.units.total > 0 && (
          <span className="mt-2 block text-[15px] text-body">
            {p.units.total} units · {p.units.available} available · {p.units.booked} booked
          </span>
        )}
      </Link>
    </li>
  );

  const counts = Object.fromEntries(DIVISIONS.map((d) => [d.key, all.filter((p) => p.division === d.key).length]));

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <div className="flex items-start justify-between gap-4 lg:items-end">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold tracking-tight lg:text-[44px]">Projects</h1>
          <p className="mt-1 text-[15px] text-muted">
            <span className="lg:hidden">
              {active.length} active · {avg}% average progress
            </span>
            <span className="hidden lg:inline">Everything shown on the website&apos;s Projects page. Progress is updated from the PM desk.</span>
          </p>
        </div>
        {can("projects", "add") && (
          <Link href="/admin/projects/new" className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-paper hover:bg-body">
            <Icon name="plus" className="h-4.5 w-4.5" /> <span className="lg:hidden">Project</span>
            <span className="hidden lg:inline">Add project</span>
          </Link>
        )}
      </div>
      {sp.saved && SAVED[sp.saved] && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{SAVED[sp.saved]}</p>}
      <FormError code={sp.error} />

      <dl className="admin-card mt-8 hidden grid-cols-4 divide-x divide-line lg:grid">
        {[
          { l: "Active projects", v: active.length },
          { l: "Average progress", v: `${avg}%` },
          { l: "Developments with units", v: active.filter((p) => p.units.total > 0).length },
          { l: "Featured on home page", v: active.filter((p) => p.featured).length },
        ].map((s) => (
          <div key={s.l} className="flex flex-col-reverse justify-end p-7">
            <dt className="mb-2 text-[15px] text-muted">{s.l}</dt>
            <dd className="order-last text-[34px] leading-none font-semibold">{s.v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <nav aria-label="Division" className="-mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:w-auto lg:px-0">
          <ul className="flex gap-2 lg:gap-1 lg:rounded-full lg:bg-[#ebe9e4] lg:p-1.5">
            {[{ key: undefined as string | undefined, label: "All", n: all.length }, ...DIVISIONS.map((d) => ({ key: d.key as string | undefined, label: d.label, n: counts[d.key] }))].map((t) => {
              const on = t.key === division;
              return (
                <li key={t.label} className="shrink-0">
                  <Link
                    href={href({ d: t.key ?? null })}
                    aria-current={on ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-full border-[1.5px] px-4 py-2.5 text-[15px] lg:border-0 ${on ? "border-ink bg-ink font-semibold text-paper lg:bg-white lg:text-ink lg:shadow-sm" : "border-line-strong bg-white text-body lg:bg-transparent"}`}
                  >
                    {t.label} <span className={`rounded-full px-2 text-sm ${on ? "bg-white/20 lg:bg-mist" : "bg-mist"}`}>{t.n}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <form method="get" action="/admin/projects" className="hidden min-w-0 flex-1 lg:block lg:max-w-md">
          {division && <input type="hidden" name="d" value={division} />}
          {archived && <input type="hidden" name="archived" value="1" />}
          <label className="flex items-center gap-3 rounded-full border-[1.5px] border-line-strong bg-white px-5 py-3 focus-within:border-ink">
            <Icon name="search" className="h-5 w-5 text-muted" />
            <input name="q" type="search" defaultValue={sp.q} placeholder="Search projects" aria-label="Search projects" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
          </label>
        </form>
        <nav aria-label="Active or archived" className="ml-auto hidden gap-5 text-[15px] lg:flex">
          <Link href={href({ archived: false })} className={`pb-1.5 ${!archived ? "border-b-2 border-ink font-semibold" : "text-muted"}`}>
            Active ({active.length})
          </Link>
          <Link href={`${href({ archived: true })}`} className={`pb-1.5 ${archived ? "border-b-2 border-ink font-semibold" : "text-muted"}`}>
            Archived ({archivedCount})
          </Link>
        </nav>
      </div>

      {list.length === 0 && <p className="admin-card mt-6 px-6 py-12 text-center text-muted">{archived ? "No archived projects." : "No projects match."}</p>}

      {/* Computer: card sections */}
      <div className="hidden lg:block">
        {withUnits.length > 0 && (
          <section aria-labelledby="dev" className="mt-8">
            <h2 id="dev" className="text-[22px] font-semibold">
              Developments with units{" "}
              <span className="text-[15px] font-normal text-muted">
                {withUnits.length} · units are listed under{" "}
                <Link href="/admin/properties" className="underline">
                  Properties
                </Link>
              </span>
            </h2>
            <ul className="mt-4 grid gap-5 xl:grid-cols-2 min-[1400px]:grid-cols-3">{withUnits.map(card)}</ul>
          </section>
        )}
        {services.length > 0 && (
          <section aria-labelledby="svc" className="mt-10">
            <h2 id="svc" className="text-[22px] font-semibold">
              Client and service projects{" "}
              <span className="text-[15px] font-normal text-muted">
                {services.length} project{services.length === 1 ? "" : "s"}
              </span>
            </h2>
            <ul className="mt-4 grid gap-5 xl:grid-cols-2 min-[1400px]:grid-cols-3">{services.map(card)}</ul>
          </section>
        )}
      </div>

      {/* Phone: list */}
      {list.length > 0 && <ul className="-mx-4 mt-5 divide-y divide-line border-y border-line bg-white lg:hidden">{list.map(mobileRow)}</ul>}
      <p className="mt-6 text-center text-sm lg:hidden">
        <Link href={href({ archived: !archived })} className="text-muted underline">
          {archived ? `Back to active projects` : `Archived (${archivedCount})`}
        </Link>
      </p>
    </div>
  );
}
