"use client";

import { useEffect, useState } from "react";

/**
 * Appears when rows are ticked: assign them to someone or move them to a stage in one go.
 * Row checkboxes live in the table and point at this form with form="bulk-form".
 */
export function BulkBar({
  staff,
  stages,
  returnTo,
  action,
}: {
  staff: { id: string; name: string }[];
  stages: { key: string; label: string }[];
  returnTo: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const boxes = () => [...document.querySelectorAll<HTMLInputElement>('input[name="ids"][form="bulk-form"]')];
    const update = () => setCount(boxes().filter((b) => b.checked).length);
    const onChange = (e: Event) => {
      const t = e.target as HTMLInputElement;
      if (t.dataset.selectAll === "1") boxes().forEach((b) => (b.checked = t.checked));
      update();
    };
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
  }, []);

  return (
    <form id="bulk-form" action={action} className={count ? "" : "hidden"}>
      <input type="hidden" name="return" value={returnTo} />
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[22px] bg-ink px-5 py-3 text-paper">
        <span className="text-sm font-semibold">{count} selected</span>
        <select name="op" required defaultValue="" aria-label="Bulk action" className="min-w-0 rounded-full bg-white/10 px-4 py-2 text-sm text-paper outline-none">
          <option value="" disabled className="text-ink">
            Choose an action…
          </option>
          <optgroup label="Assign to" className="text-ink">
            {staff.map((s) => (
              <option key={s.id} value={`assign:${s.id}`} className="text-ink">
                {s.name}
              </option>
            ))}
            <option value="assign:none" className="text-ink">
              Nobody (unassign)
            </option>
          </optgroup>
          <optgroup label="Move to stage" className="text-ink">
            {stages.map((s) => (
              <option key={s.key} value={`status:${s.key}`} className="text-ink">
                {s.label}
              </option>
            ))}
          </optgroup>
        </select>
        <button type="submit" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink">
          Apply
        </button>
      </div>
    </form>
  );
}
