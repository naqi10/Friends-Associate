"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ImportResult } from "@/lib/actions/inventory";

export function ImportForm({ action }: { action: (prev: ImportResult | null, formData: FormData) => Promise<ImportResult> }) {
  const [result, run, pending] = useActionState(action, null);
  return (
    <div>
      <form action={run} className="admin-card space-y-5 p-7">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[22px] border-2 border-dashed border-line-strong bg-paper px-6 py-10 text-center hover:bg-mist">
          <span className="text-lg font-semibold">Choose a CSV file</span>
          <span className="text-sm text-muted">Up to 500 listings, 2 MB. Save from Excel as “CSV UTF-8”.</span>
          <input name="file" type="file" accept=".csv,text/csv" required className="mt-2 text-sm" />
        </label>
        <button type="submit" disabled={pending} className="rounded-full bg-ink px-6 py-3 text-[15px] font-semibold text-paper hover:bg-body disabled:opacity-60">
          {pending ? "Checking…" : "Check and import"}
        </button>
      </form>

      {result?.ok && (
        <div role="status" className="mt-6 rounded-[22px] bg-emerald-50 p-5 text-emerald-900">
          <p className="font-semibold">
            {result.created} listing{result.created === 1 ? "" : "s"} imported.
          </p>
          <p className="mt-1 text-sm">
            Listings marked “published: yes” are on the website now; the rest are hidden until you publish them.{" "}
            <Link href="/admin/properties" className="font-semibold underline">
              Open Properties
            </Link>
          </p>
        </div>
      )}
      {result && !result.ok && (
        <div role="alert" className="mt-6 rounded-[22px] border border-red-200 bg-red-50 p-5 text-red-900">
          <p className="font-semibold">Nothing was imported. Please fix these and upload again:</p>
          <ul className="mt-3 space-y-1 text-sm">
            {result.errors.map((e, i) => (
              <li key={i}>
                {e.line > 0 && <strong>Line {e.line}: </strong>}
                {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
