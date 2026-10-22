"use client";

import { useEffect, useMemo, useState } from "react";
import { EDITABLE_ROLES, RESOURCES, RIGHTS, isApplicable } from "@/lib/permission-catalog";
import type { AppResource, AppRight } from "@/lib/types";

type RoleKey = (typeof EDITABLE_ROLES)[number]["key"];
type AnyRole = RoleKey | "admin";
const k = (role: RoleKey, resource: AppResource, right: AppRight) => `${role}:${resource}:${right}`;

const ROLES: { key: AnyRole; label: string; description: string }[] = [
  ...EDITABLE_ROLES,
  { key: "admin", label: "Admin", description: "Always full access" },
];

type Props = {
  initial: string[];
  saveAction: (formData: FormData) => Promise<void>;
  /** People per role, for the role cards (visitor has none). */
  counts: Partial<Record<AnyRole, number>>;
  initialRole?: string;
};

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

/**
 * Permissions screen: pick a role, then switch each area's View / Add / Edit / Delete on or off.
 * Every role's checkboxes are always in the form (only the chosen role is shown), so one save covers all roles.
 */
export function PermissionMatrix({ initial, saveAction, counts, initialRole }: Props) {
  const initialSet = useMemo(() => new Set(initial), [initial]);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(initial));
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<AnyRole>(ROLES.some((r) => r.key === initialRole) ? (initialRole as AnyRole) : "sales");

  const changes = useMemo(() => {
    let n = 0;
    for (const key of checked) if (!initialSet.has(key)) n++;
    for (const key of initialSet) if (!checked.has(key)) n++;
    return n;
  }, [checked, initialSet]);

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!changes || submitting) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [changes, submitting]);

  const has = (r: AnyRole, res: AppResource, right: AppRight) => r === "admin" || checked.has(k(r, res, right));
  const applicable = (r: AnyRole, res: AppResource, right: AppRight) => r === "admin" || isApplicable(r, res, right);

  function toggle(r: RoleKey, resource: AppResource, right: AppRight, on: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) {
        next.add(k(r, resource, right));
        // Add/Edit/Delete are meaningless without View, so View comes along automatically.
        if (right !== "view" && isApplicable(r, resource, "view")) next.add(k(r, resource, "view"));
      } else {
        next.delete(k(r, resource, right));
        // Removing View removes everything else on that row for this role.
        if (right === "view") for (const x of RIGHTS) next.delete(k(r, resource, x.key));
      }
      return next;
    });
  }

  const areas = (r: AnyRole) => RESOURCES.filter((res) => RIGHTS.some((x) => has(r, res.key, x.key) && applicable(r, res.key, x.key))).length;
  const countLine = (r: AnyRole) => {
    const n = counts[r];
    const who = r === "visitor" ? "Public" : r === "buyer" ? `${n ?? 0} customer${n === 1 ? "" : "s"}` : `${n ?? 0} staff`;
    return `${who} · ${areas(r)} of ${RESOURCES.length} areas`;
  };
  const current = ROLES.find((r) => r.key === role)!;
  const locked = role === "admin";

  return (
    <form action={saveAction} onSubmit={() => setSubmitting(true)}>
      {/* Role picker: cards on desktop, chips on phones */}
      <div className="mt-6 hidden grid-cols-5 gap-4 lg:grid">
        {ROLES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRole(r.key)}
            aria-pressed={role === r.key}
            className={`flex flex-col rounded-[24px] border p-5 text-left transition ${role === r.key ? "border-ink bg-ink text-paper" : "border-line bg-white hover:border-line-strong"}`}
          >
            <span className="flex items-center justify-between gap-2 text-lg font-semibold">
              {r.label}
              {r.key === "admin" && (
                <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              )}
            </span>
            <span className={`mt-1 text-sm ${role === r.key ? "text-faint" : "text-muted"}`}>{r.description}</span>
            <span className={`mt-4 text-sm ${role === r.key ? "text-faint" : "text-muted"}`}>{countLine(r.key)}</span>
          </button>
        ))}
      </div>
      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        {ROLES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRole(r.key)}
            aria-pressed={role === r.key}
            className={`shrink-0 rounded-full border-[1.5px] px-5 py-2.5 text-[15px] ${role === r.key ? "border-ink bg-ink font-semibold text-paper" : "border-line-strong bg-white"}`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[15px] text-muted lg:hidden">
        {current.description} · {countLine(role)}
      </p>

      <div className="mt-6 grid items-start gap-6 grid-cols-[minmax(0,1fr)] min-[1300px]:grid-cols-[minmax(0,1fr)_400px]">
        <section className="admin-card overflow-hidden">
          <div className="border-b border-line px-5 py-5 sm:px-7">
            <h2 className="text-[22px] font-semibold">{current.label} can…</h2>
            <p className="text-[15px] text-muted">{locked ? "Admins always have full access, so the system can never be locked." : current.description}</p>
          </div>
          <ul className="divide-y divide-line">
            {RESOURCES.map((res) => (
              <li key={res.key} className="flex flex-col gap-3 px-5 py-4 sm:px-7 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-[17px] font-semibold">{res.label}</p>
                  <p className="text-sm text-muted">{res.description}</p>
                </div>
                <div className="grid shrink-0 grid-cols-4 gap-2 md:w-[340px]">
                  {RIGHTS.map((right) => {
                    if (!applicable(role, res.key, right.key)) {
                      return (
                        <span key={right.key} title="Doesn't apply to this role" className="flex h-10 items-center justify-center rounded-full border border-dashed border-line text-sm text-line-strong">
                          —
                        </span>
                      );
                    }
                    const on = has(role, res.key, right.key);
                    const changed = !locked && checked.has(k(role as RoleKey, res.key, right.key)) !== initialSet.has(k(role as RoleKey, res.key, right.key));
                    return (
                      <button
                        key={right.key}
                        type="button"
                        disabled={locked}
                        aria-pressed={on}
                        aria-label={`${current.label}: ${right.label} ${res.label}`}
                        onClick={() => toggle(role as RoleKey, res.key, right.key, !on)}
                        className={`relative flex h-10 items-center justify-center gap-1 rounded-full border-[1.5px] text-sm font-semibold transition disabled:cursor-not-allowed ${
                          on ? "border-ink bg-ink text-paper" : "border-line-strong bg-white text-muted hover:border-ink hover:text-ink"
                        } ${locked ? "opacity-80" : ""}`}
                      >
                        {on && <Check />}
                        {right.label}
                        {changed && <span aria-hidden className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white" />}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-4 text-sm text-muted sm:px-7">
            Turning on Add, Edit or Delete also turns on View. &ldquo;—&rdquo; means the action doesn&apos;t exist for this role.
          </p>
        </section>

        <aside className="admin-card hidden p-5 md:block">
          <h2 className="text-[20px] font-semibold">All roles at a glance</h2>
          <p className="text-sm text-muted">Each block shows View · Add · Edit · Delete</p>
          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="text-muted">
                <th className="pb-3 text-left font-medium">Area</th>
                {ROLES.map((r) => (
                  <th key={r.key} className="pb-3 font-medium">
                    <button type="button" onClick={() => setRole(r.key)} className={`rounded-full px-2.5 py-1 ${role === r.key ? "bg-ink text-paper" : "hover:text-ink"}`}>
                      {r.key === "project_manager" ? "PM" : r.label}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {RESOURCES.map((res) => (
                <tr key={res.key}>
                  <th scope="row" className="py-3 pr-2 text-left font-normal text-body">
                    {res.label}
                  </th>
                  {ROLES.map((r) => {
                    const any = RIGHTS.some((x) => applicable(r.key, res.key, x.key));
                    return (
                      <td key={r.key} className={`py-3 text-center ${role === r.key ? "bg-mist/70" : ""}`}>
                        {any ? (
                          <span className="inline-flex gap-0.5" aria-label={`${r.label} ${res.label}: ${RIGHTS.filter((x) => has(r.key, res.key, x.key) && applicable(r.key, res.key, x.key)).map((x) => x.label).join(", ") || "nothing"}`}>
                            {RIGHTS.map((x) => {
                              const ok = applicable(r.key, res.key, x.key);
                              const on = ok && has(r.key, res.key, x.key);
                              return <span key={x.key} className={`h-2.5 w-2.5 rounded-[2px] ${on ? "bg-teal-700" : ok ? "border border-line-strong" : "bg-line"}`} />;
                            })}
                          </span>
                        ) : (
                          <span className="text-line-strong">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-teal-700" /> Allowed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[2px] border border-line-strong" /> Not allowed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-line" /> Doesn&apos;t apply
            </span>
          </p>
        </aside>
      </div>

      {/* The real form fields: every editable role, always submitted together. */}
      <div hidden>
        {EDITABLE_ROLES.map((r) =>
          RESOURCES.map((res) =>
            RIGHTS.filter((x) => isApplicable(r.key, res.key, x.key)).map((x) => (
              <input key={k(r.key, res.key, x.key)} type="checkbox" name={`perm:${k(r.key, res.key, x.key)}`} checked={checked.has(k(r.key, res.key, x.key))} readOnly />
            )),
          ),
        )}
      </div>

      <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-10 -mx-4 mt-6 flex items-center gap-3 border-t border-line bg-white/95 px-4 py-4 backdrop-blur sm:-mx-[30px] sm:px-[30px] lg:bottom-0">
        <span className="min-w-0 flex-1 text-[15px] text-muted" aria-live="polite">
          {changes === 0 ? "No unsaved changes" : `${changes} unsaved change${changes === 1 ? "" : "s"}`}
        </span>
        <button
          type="button"
          disabled={changes === 0 || submitting}
          onClick={() => setChecked(new Set(initial))}
          className="hidden rounded-full border-[1.5px] border-line-strong bg-white px-6 py-3 text-[15px] font-semibold hover:bg-mist disabled:opacity-40 sm:block"
        >
          Discard
        </button>
        <button
          type="submit"
          disabled={changes === 0 || submitting}
          className="rounded-full bg-ink px-6 py-3 text-[15px] font-semibold text-paper hover:bg-body disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-white"
        >
          {submitting ? "Saving…" : <><span className="sm:hidden">Save</span><span className="hidden sm:inline">Save permissions</span></>}
        </button>
      </div>
    </form>
  );
}
