"use client";

import { useEffect, useState } from "react";

type Group = { label: string; options: { value: string; label: string }[] };

/**
 * Bar that appears when table rows are ticked. Row checkboxes use form={formId}; a checkbox with
 * data-select-all="<formId>" ticks every row of that form.
 */
export function BulkActions({
  formId,
  action,
  returnTo,
  groups,
  noun = "selected",
}: {
  formId: string;
  action: (formData: FormData) => Promise<void>;
  returnTo: string;
  groups: Group[];
  noun?: string;
}) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const boxes = () => [...document.querySelectorAll<HTMLInputElement>(`input[name="ids"][form="${formId}"]`)];
    const onChange = (e: Event) => {
      const t = e.target as HTMLInputElement;
      if (t.dataset.selectAll === formId) boxes().forEach((b) => (b.checked = t.checked));
      setCount(boxes().filter((b) => b.checked).length);
    };
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
  }, [formId]);

  return (
    <form id={formId} action={action} className={count ? "" : "hidden"}>
      <input type="hidden" name="return" value={returnTo} />
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[22px] bg-ink px-5 py-3 text-paper">
        <span className="text-sm font-semibold">
          {count} {noun}
        </span>
        <select name="op" required defaultValue="" aria-label="Bulk action" className="min-w-0 rounded-full bg-white/10 px-4 py-2 text-sm text-paper outline-none">
          <option value="" disabled className="text-ink">
            Choose an action…
          </option>
          {groups.map((g) => (
            <optgroup key={g.label} label={g.label} className="text-ink">
              {g.options.map((o) => (
                <option key={o.value} value={o.value} className="text-ink">
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink">
          Apply
        </button>
      </div>
    </form>
  );
}
