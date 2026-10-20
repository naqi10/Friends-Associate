"use client";

import Link from "next/link";
import { useState } from "react";
import { stageState } from "@/lib/catalog";

type Stage = { id: string; name: string; value: number; published: number };

function StageIcon({ percent }: { percent: number }) {
  const s = stageState(percent).key;
  if (s === "done")
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5 9-10" />
        </svg>
      </span>
    );
  if (s === "progress")
    return (
      <span aria-hidden className="h-7 w-7 shrink-0 rounded-full border-[2.5px] border-ink" style={{ background: "linear-gradient(90deg,#0e0e0e 50%,transparent 50%)" }} />
    );
  return <span aria-hidden className="h-7 w-7 shrink-0 rounded-full border-2 border-line-strong" />;
}

/**
 * Stage editor for the PM desk: −/+ in 5% steps (or type a number), live overall %, status, site update and photos.
 * "Save draft" keeps it private; "Save & publish" makes it visible to buyers. The server re-validates everything.
 */
export function PmEditor({
  projectId,
  status,
  statusOptions,
  stages: initial,
  draftText,
  draftPhotos,
  addStageHref,
  action,
  compact = false,
}: {
  projectId: string;
  status: string;
  statusOptions: string[];
  stages: Stage[];
  draftText: string;
  draftPhotos: number;
  addStageHref: string;
  action: (formData: FormData) => Promise<void>;
  compact?: boolean;
}) {
  const [stages, setStages] = useState(initial);
  const [photoCount, setPhotoCount] = useState(0);
  const overall = stages.length ? Math.round(stages.reduce((s, x) => s + x.value, 0) / stages.length) : 0;
  const changed = stages.some((s) => s.value !== s.published);
  const set = (id: string, v: number) => setStages((list) => list.map((s) => (s.id === id ? { ...s, value: Math.max(0, Math.min(100, v)) } : s)));

  return (
    <form action={action}>
      <input type="hidden" name="project_id" value={projectId} />

      {!compact && (
        <div className="flex items-center gap-5 rounded-[22px] bg-paper p-5">
          <span className="text-[52px] leading-none font-semibold tracking-tight">{overall}%</span>
          <span className="min-w-0 flex-1">
            <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-line">
              <span className="block h-full rounded-full bg-ink transition-all" style={{ width: `${overall}%` }} />
            </span>
            <span className="mt-2 block text-sm text-muted">
              Overall · average of {stages.length} stage{stages.length === 1 ? "" : "s"}
              {changed && <span className="ml-1 font-semibold text-amber-800">· not published yet</span>}
            </span>
          </span>
        </div>
      )}

      {compact ? (
        <input type="hidden" name="status" value={status} />
      ) : (
        <label className="mt-6 block text-[15px] text-muted">
          Project status
          <select name="status" defaultValue={status} className="mt-2 w-full rounded-2xl border border-line-strong bg-white px-4 py-3.5 text-base text-ink">
            {statusOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
      )}

      {!compact && (
        <div className="mt-7 flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Stages</h3>
          <Link href={addStageHref} className="text-[15px] text-teal-800 underline underline-offset-4">
            + Add stage
          </Link>
        </div>
      )}
      {stages.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No stages yet.{" "}
          <Link href={addStageHref} className="underline">
            Add the first stage
          </Link>
          .
        </p>
      ) : (
        <ul className={`divide-y divide-line ${compact ? "" : "mt-3 border-t border-line"}`}>
          {stages.map((s) => {
            const state = stageState(s.value);
            return (
              <li key={s.id} className="flex items-center gap-3 py-3.5">
                <input type="hidden" name="stage_id" value={s.id} />
                <StageIcon percent={s.value} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[15px] sm:text-base ${state.key === "progress" ? "font-semibold" : ""}`}>{s.name}</span>
                  {!compact && (
                    <span className={`block text-sm ${state.key === "done" ? "text-emerald-700" : state.key === "progress" ? "text-ink" : "text-muted"}`}>{state.label}</span>
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <button type="button" onClick={() => set(s.id, s.value - 5)} aria-label={`Lower ${s.name}`} className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-lg hover:bg-mist">
                    −
                  </button>
                  <label className="sr-only" htmlFor={`st-${s.id}`}>
                    {s.name} percent
                  </label>
                  <input
                    id={`st-${s.id}`}
                    name={`stage_${s.id}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={s.value}
                    onChange={(e) => set(s.id, Number(e.target.value) || 0)}
                    className="w-14 bg-transparent text-center text-base font-semibold [appearance:textfield] outline-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button type="button" onClick={() => set(s.id, s.value + 5)} aria-label={`Raise ${s.name}`} className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-lg hover:bg-mist">
                    +
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {!compact && (
        <label className="mt-6 block text-[15px] text-muted">
          Site update for buyers (optional)
          <textarea
            name="update_text"
            rows={3}
            maxLength={1000}
            defaultValue={draftText}
            placeholder="What changed on site this week?"
            className="mt-2 w-full rounded-2xl border border-line-strong bg-white px-4 py-3 text-base text-ink outline-none focus:border-ink"
          />
        </label>
      )}

      <div className={`flex flex-wrap gap-3 ${compact ? "mt-4" : "mt-4"}`}>
        <label
          className={`flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-5 py-3 text-[15px] font-semibold hover:bg-mist ${
            compact ? "flex-1 justify-center border-line-strong bg-white" : "w-full rounded-2xl border-dashed border-line-strong font-normal text-body"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
            <path d="M4 7h3l2-2h6l2 2h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8" />
          </svg>
          {photoCount ? `${photoCount} photo${photoCount === 1 ? "" : "s"} selected` : compact ? "Site photo" : "Add site photos"}
          {draftPhotos > 0 && !photoCount && <span className="text-sm text-muted">({draftPhotos} in draft)</span>}
          <input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setPhotoCount(e.target.files?.length ?? 0)} className="sr-only" />
        </label>
        {compact && (
          <button type="submit" name="mode" value="publish" className="flex-1 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-paper hover:bg-body">
            Save &amp; publish
          </button>
        )}
      </div>

      {!compact && (
        <div className="mt-6 flex gap-3 border-t border-line pt-6">
          <button type="submit" name="mode" value="publish" className="flex-1 rounded-full bg-ink py-3.5 text-base font-semibold text-paper hover:bg-body">
            Save &amp; publish
          </button>
          <button type="submit" name="mode" value="draft" className="rounded-full border-[1.5px] border-line-strong bg-white px-6 py-3.5 text-base font-semibold hover:bg-mist">
            Save draft
          </button>
        </div>
      )}
    </form>
  );
}
