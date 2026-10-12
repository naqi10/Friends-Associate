"use client";

import { useEffect, useMemo, useState } from "react";
import { EDITABLE_ROLES, RESOURCES, RIGHTS, isApplicable } from "@/lib/permission-catalog";
import type { AppResource, AppRight } from "@/lib/types";

type RoleKey = (typeof EDITABLE_ROLES)[number]["key"];
const k = (role: RoleKey, resource: AppResource, right: AppRight) => `${role}:${resource}:${right}`;

type Props = {
  initial: string[];
  saveAction: (formData: FormData) => Promise<void>;
};

export function PermissionMatrix({ initial, saveAction }: Props) {
  const initialSet = useMemo(() => new Set(initial), [initial]);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(initial));
  const [submitting, setSubmitting] = useState(false);

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

  function toggle(role: RoleKey, resource: AppResource, right: AppRight, on: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) {
        next.add(k(role, resource, right));
        // Add/Edit/Delete are meaningless without View, so View comes along automatically.
        if (right !== "view" && isApplicable(role, resource, "view")) next.add(k(role, resource, "view"));
      } else {
        next.delete(k(role, resource, right));
        // Removing View removes everything else on that row for this role.
        if (right === "view") for (const r of RIGHTS) next.delete(k(role, resource, r.key));
      }
      return next;
    });
  }

  return (
    <form action={saveAction} onSubmit={() => setSubmitting(true)}>
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <caption className="sr-only">Permissions by role and area</caption>
          <thead>
            <tr className="bg-stone-50">
              <th scope="col" rowSpan={2} className="border-b border-r px-3 py-2 text-left font-medium">
                Area
              </th>
              {EDITABLE_ROLES.map((role) => (
                <th key={role.key} scope="colgroup" colSpan={RIGHTS.length} className="border-b border-r px-3 py-2 text-center font-semibold">
                  {role.label}
                  <span className="block text-xs font-normal text-stone-500">{role.description}</span>
                </th>
              ))}
              <th scope="col" rowSpan={2} className="border-b px-3 py-2 text-center font-semibold">
                Admin
                <span className="block text-xs font-normal text-stone-500">Always full</span>
              </th>
            </tr>
            <tr className="bg-stone-50 text-xs text-stone-500">
              {EDITABLE_ROLES.map((role) =>
                RIGHTS.map((right, i) => (
                  <th
                    key={`${role.key}-${right.key}`}
                    scope="col"
                    className={`border-b px-1 py-1.5 font-medium ${i === RIGHTS.length - 1 ? "border-r" : ""}`}
                  >
                    {right.label}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {RESOURCES.map((res) => (
              <tr key={res.key} className="border-b last:border-b-0 hover:bg-stone-50/60">
                <th scope="row" className="border-r px-3 py-2 text-left align-top font-medium">
                  {res.label}
                  <span className="block text-xs font-normal text-stone-500">{res.description}</span>
                </th>
                {EDITABLE_ROLES.map((role) =>
                  RIGHTS.map((right, i) => {
                    const id = k(role.key, res.key, right.key);
                    const applicable = isApplicable(role.key, res.key, right.key);
                    const changed = checked.has(id) !== initialSet.has(id);
                    return (
                      <td
                        key={id}
                        className={`px-1 py-2 text-center ${i === RIGHTS.length - 1 ? "border-r" : ""} ${changed ? "bg-amber-50" : ""}`}
                      >
                        {applicable ? (
                          <input
                            type="checkbox"
                            name={`perm:${id}`}
                            checked={checked.has(id)}
                            onChange={(e) => toggle(role.key, res.key, right.key, e.target.checked)}
                            aria-label={`${role.label}: ${right.label} ${res.label}`}
                            className="h-4 w-4 accent-teal-700"
                          />
                        ) : (
                          <span className="text-stone-300" title="Not applicable to this role">
                            —
                          </span>
                        )}
                      </td>
                    );
                  }),
                )}
                <td className="px-3 py-2 text-center text-teal-700" aria-label="Admin: full access">
                  ✓
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 mt-4 flex flex-wrap items-center gap-3 border-t border-stone-200 bg-stone-50/95 py-3 backdrop-blur">
        <button
          type="submit"
          disabled={changes === 0 || submitting}
          className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Saving…" : "Save permissions"}
        </button>
        <button
          type="button"
          disabled={changes === 0 || submitting}
          onClick={() => setChecked(new Set(initial))}
          className="rounded-md border border-stone-300 px-4 py-2 text-sm hover:bg-white disabled:opacity-40"
        >
          Discard changes
        </button>
        <span className="text-sm text-stone-600" aria-live="polite">
          {changes === 0 ? "No unsaved changes" : `${changes} unsaved change${changes === 1 ? "" : "s"} (highlighted)`}
        </span>
      </div>
    </form>
  );
}
