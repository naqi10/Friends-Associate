import { formatDate } from "@/lib/format";
import type { ProjectStageRow } from "@/lib/data";

/** Per-stage progress bars, e.g. "Grey structure 100%", "Building layout laid 50%". */
export function StageBars({ stages, compact = false }: { stages: ProjectStageRow[]; compact?: boolean }) {
  if (stages.length === 0) return <p className="text-sm text-stone-500">No project updates have been published yet.</p>;
  return (
    <ul className={compact ? "space-y-2" : "space-y-3"}>
      {stages.map((s) => (
        <li key={s.id}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-stone-800">{s.name}</span>
            <span className={`tabular-nums font-semibold ${s.percent === 100 ? "text-teal-700" : "text-stone-700"}`}>{s.percent}%</span>
          </div>
          <div
            className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100"
            role="progressbar"
            aria-label={s.name}
            aria-valuenow={s.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={`h-full rounded-full ${s.percent === 100 ? "bg-teal-700" : "bg-amber-500"}`} style={{ width: `${s.percent}%` }} />
          </div>
          {!compact && (s.target_date || s.note) && (
            <p className="mt-1 text-xs text-stone-500">
              {s.target_date && <>Until {formatDate(s.target_date)}</>}
              {s.target_date && s.note && " · "}
              {s.note}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
