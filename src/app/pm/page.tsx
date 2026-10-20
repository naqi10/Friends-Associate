import Link from "next/link";
import type { Metadata } from "next";
import { DeniedNotice } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { Icon } from "@/components/admin/shell/icons";
import { PmEditor } from "@/components/pm/PmEditor";
import { savePmDeskAction } from "@/lib/actions/pm";
import { PROJECT_CATEGORIES, PROJECT_STATUS_OPTIONS, STATUS_GROUPS, labelOf, statusGroup, type StatusGroup } from "@/lib/catalog";
import { getPmProjects, overallPercent, type PmProject } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

export const metadata: Metadata = { title: "Project manager desk", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ denied?: string; p?: string; g?: string; saved?: string; error?: string; n?: string }> };

/** What buyers see today: published stage values, overall = their average. */
function summary(p: PmProject) {
  const overall = overallPercent(p.stages, p.progressPercent);
  const done = p.stages.filter((s) => s.percent >= 100).length;
  const current = p.stages.find((s) => s.percent < 100);
  return { overall, done, current };
}

function chip(status: string) {
  const g = STATUS_GROUPS.find((x) => x.key === statusGroup(status))!;
  return g.chip;
}

export default async function PmDeskPage({ searchParams }: Props) {
  const { can } = await requireStaff("progress", "view");
  const sp = await searchParams;
  const canEdit = can("progress", "update");
  const projects = await getPmProjects();
  const group = (STATUS_GROUPS.some((g) => g.key === sp.g) ? sp.g : undefined) as StatusGroup | undefined;
  const list = group ? projects.filter((p) => statusGroup(p.status) === group) : projects;
  const selected = projects.find((p) => p.id === sp.p) ?? (sp.p ? undefined : list[0]);
  const counts = Object.fromEntries(STATUS_GROUPS.map((g) => [g.key, projects.filter((p) => statusGroup(p.status) === g.key).length])) as Record<StatusGroup, number>;
  const avg = projects.length ? Math.round(projects.reduce((s, p) => s + summary(p).overall, 0) / projects.length) : 0;
  const statusOptions = [...new Set([...PROJECT_STATUS_OPTIONS, ...projects.map((p) => p.status)])];
  const href = (over: { p?: string; g?: string | null } = {}) => {
    const q = new URLSearchParams();
    const g = over.g === null ? undefined : (over.g ?? group);
    if (g) q.set("g", g);
    const p = over.p ?? sp.p;
    if (p) q.set("p", p);
    const s = q.toString();
    return s ? `/pm?${s}` : "/pm";
  };
  const notice =
    sp.saved === "published"
      ? `Published. Buyers see the new progress${Number(sp.n) > 0 ? ` and ${sp.n} buyer${sp.n === "1" ? " was" : "s were"} notified` : ""}.`
      : sp.saved === "draft"
        ? "Draft saved. Buyers still see the last published progress."
        : undefined;
  const tabs = [{ key: undefined as StatusGroup | undefined, label: "All projects", short: "All", n: projects.length }, ...STATUS_GROUPS.filter((g) => g.key !== "other" && counts[g.key] > 0).map((g) => ({ key: g.key as StatusGroup | undefined, label: g.label, short: g.short, n: counts[g.key] }))];

  const editor = (p: PmProject, compact: boolean) => (
    <PmEditor
      key={`${p.id}-${compact}`}
      projectId={p.id}
      status={p.draftStatus ?? p.status}
      statusOptions={statusOptions}
      stages={p.stages.map((s) => ({ id: s.id, name: s.name, value: s.draftPercent ?? s.percent, published: s.percent }))}
      draftText={p.draftUpdate?.text ?? ""}
      draftPhotos={p.draftUpdate?.photos.length ?? 0}
      addStageHref={`/pm/${p.id}#add`}
      action={savePmDeskAction}
      compact={compact}
    />
  );

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <DeniedNotice denied={sp.denied} />
      <div className="flex items-start justify-between gap-4 lg:items-end">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold tracking-tight lg:text-[44px]">
            <span className="lg:hidden">PM desk</span>
            <span className="hidden lg:inline">Project manager desk</span>
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            <span className="lg:hidden">
              {projects.length} projects · {avg}% average progress
            </span>
            <span className="hidden lg:inline">Pick a project, update its stages, publish. Buyers see the published progress.</span>
          </p>
        </div>
        {can("projects", "add") && (
          <Link href="/admin/projects/new" className="hidden shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-paper hover:bg-body lg:flex">
            <Icon name="plus" className="h-4.5 w-4.5" /> New project
          </Link>
        )}
      </div>

      {notice && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>}
      <FormError code={sp.error} />

      {/* Figures (computer) */}
      <dl className="admin-card mt-8 hidden grid-cols-5 divide-x divide-line lg:grid">
        {[
          { l: "Projects", v: projects.length },
          { l: "Average progress", v: `${avg}%` },
          { l: "Under construction", v: counts.construction },
          { l: "Awaiting approvals", v: counts.approvals },
          { l: "Completed", v: counts.completed },
        ].map((s) => (
          <div key={s.l} className="flex flex-col-reverse justify-end p-7">
            <dt className="mt-0 mb-2 text-[15px] text-muted">{s.l}</dt>
            <dd className="order-last text-[34px] leading-none font-semibold">{s.v}</dd>
          </div>
        ))}
      </dl>

      {/* Tabs */}
      <nav aria-label="Project groups" className="-mx-4 mt-6 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
        <ul className="flex gap-2">
          {tabs.map((t) => {
            const on = t.key === group;
            return (
              <li key={t.label} className="shrink-0">
                <Link
                  href={href({ g: t.key ?? null, p: "" })}
                  aria-current={on ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-full border-[1.5px] px-4 py-2.5 text-[15px] whitespace-nowrap ${on ? "border-ink bg-ink font-semibold text-paper" : "border-line-strong bg-white text-body"}`}
                >
                  <span className="lg:hidden">{t.short}</span>
                  <span className="hidden lg:inline">{t.label}</span>
                  <span className={`rounded-full px-2 text-sm ${on ? "bg-white/20" : "bg-mist"}`}>{t.n}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px] 2xl:grid-cols-[minmax(0,1fr)_480px]">
        {list.length === 0 ? (
          <p className="admin-card px-6 py-12 text-center text-muted">No projects in this group.</p>
        ) : (
          <ul className="admin-card divide-y divide-line overflow-hidden max-lg:space-y-4 max-lg:divide-y-0 max-lg:overflow-visible max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none">
            {list.map((p) => {
              const s = summary(p);
              const on = selected?.id === p.id;
              const complete = p.stages.length > 0 && s.done === p.stages.length;
              return (
                <li key={p.id} className={`max-lg:admin-card ${on ? "lg:bg-paper lg:shadow-[inset_4px_0_0_#0e0e0e]" : "lg:hover:bg-[#fcfbf9]"}`}>
                  <Link href={href({ p: p.id })} scroll={false} className="block p-5 sm:p-6">
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-lg font-semibold lg:text-[19px]">{p.name}</span>
                          <span className={`hidden rounded-full px-3 py-0.5 text-sm font-semibold lg:inline ${chip(p.status)}`}>{p.status}</span>
                          {p.hasDraft && <span className="rounded-full border border-dashed border-amber-400 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Draft</span>}
                        </span>
                        <span className="mt-0.5 block text-[15px] text-muted">
                          {labelOf(PROJECT_CATEGORIES, p.category)}
                          <span className="hidden lg:inline"> · {p.city}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-[26px] leading-none font-semibold lg:text-[30px]">{s.overall}%</span>
                    </span>
                    <span aria-hidden className="mt-4 block h-1.5 overflow-hidden rounded-full bg-line">
                      <span className={`block h-full rounded-full ${complete ? "bg-emerald-700" : "bg-ink"}`} style={{ width: `${s.overall}%` }} />
                    </span>
                    <span className="mt-3 flex items-center justify-between gap-3 text-[15px] text-body">
                      <span className="min-w-0 truncate">{s.current ? `Now: ${s.current.name} · ${s.current.percent}%` : p.stages.length ? "All stages complete" : "No stages yet"}</span>
                      <span className="hidden shrink-0 text-muted lg:inline">
                        {s.done} of {p.stages.length} stages done
                      </span>
                      <span className={`shrink-0 rounded-full px-3 py-0.5 text-sm font-semibold lg:hidden ${chip(p.status)}`}>{STATUS_GROUPS.find((g) => g.key === statusGroup(p.status))!.short === "Other" ? p.status : STATUS_GROUPS.find((g) => g.key === statusGroup(p.status))!.short}</span>
                    </span>
                  </Link>
                  {/* Phone: the selected project opens inline for quick updates */}
                  {on && canEdit && <div className="border-t border-line px-5 pb-5 lg:hidden">{editor(p, true)}</div>}
                </li>
              );
            })}
          </ul>
        )}

        {selected && (
          <aside aria-label={selected.name} className="admin-card hidden p-7 lg:block">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted">
                  {labelOf(PROJECT_CATEGORIES, selected.category)} · {selected.city}
                </p>
                <h2 className="mt-1 text-[24px] leading-tight font-semibold">{selected.name}</h2>
              </div>
              <Link href={can("projects", "update") ? `/admin/projects/${selected.id}` : `/projects/${selected.slug}`} className="shrink-0 text-[15px] text-teal-800 underline underline-offset-4">
                Open project →
              </Link>
            </div>
            {selected.hasDraft && (
              <p className="mt-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                This project has an unpublished draft. Buyers still see the last published values.
              </p>
            )}
            <div className="mt-5">
              {canEdit ? (
                editor(selected, false)
              ) : (
                <p className="text-sm text-muted">You can view progress but not change it. Ask an administrator for Progress → Edit.</p>
              )}
            </div>
            {selected.lastPublishedAt && (
              <p className="mt-4 text-xs text-muted">
                Last site update published {selected.lastPublishedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" })}.
              </p>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
