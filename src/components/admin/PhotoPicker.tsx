"use client";

import { useEffect, useRef, useState } from "react";
import { focalPosition } from "@/lib/media";
import { ConfirmDialog } from "./ConfirmDialog";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * Photo field for admin forms: shows the photo the website uses right now, lets the admin pick a new one
 * from their phone gallery or computer (previewed before saving), or remove it after a confirmation card.
 * Nothing changes on the website until the surrounding form is saved.
 */
export function PhotoPicker({
  label,
  name = "image",
  removeName,
  currentSrc,
  alt = "",
  hint,
  shape = "wide",
}: {
  label: string;
  /** Name of the file input the server action reads. */
  name?: string;
  /** Name of the "remove" flag the server action reads; omit when the photo cannot be removed. */
  removeName?: string;
  currentSrc?: string | null;
  alt?: string;
  hint?: string;
  shape?: "wide" | "square" | "portrait";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  // Free the in-memory preview when it is replaced or the page closes.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const hasCurrent = !!currentSrc;
  const shown = preview ?? (removed ? null : currentSrc ?? null);
  const state: "new" | "removed" | "current" | "empty" = preview ? "new" : removed ? "removed" : hasCurrent ? "current" : "empty";
  const aspect = shape === "square" ? "aspect-square" : shape === "portrait" ? "aspect-[3/4]" : "aspect-[16/10]";

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError("");
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("Please choose a JPG, PNG or WebP photo.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("This photo is larger than 10 MB. Please choose a smaller one.");
      e.target.value = "";
      return;
    }
    setPreview(URL.createObjectURL(file));
    setFileName(file.name);
    setRemoved(false);
  }

  function undo() {
    if (input.current) input.current.value = "";
    setPreview(null);
    setFileName("");
    setRemoved(false);
    setError("");
  }

  const badge = {
    current: { text: "Current photo · live on the website", cls: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
    new: { text: "New photo · press Save to publish", cls: "bg-amber-50 text-amber-900", dot: "bg-amber-500" },
    removed: { text: "Will be removed when you press Save", cls: "bg-red-50 text-red-800", dot: "bg-red-500" },
    empty: { text: "No photo yet", cls: "bg-mist text-muted", dot: "bg-faint" },
  }[state];

  return (
    <div className="rounded-[22px] border border-line bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{label}</h3>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badge.cls}`}>
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
          {badge.text}
        </span>
      </div>

      <div className={`relative mt-3 overflow-hidden rounded-2xl ${aspect} ${shown ? "bg-ph" : "stripes"}`}>
        {shown ? (
          // A plain <img> so a just-picked photo can be previewed straight from the device.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt={alt || label} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: preview ? undefined : focalPosition(shown) }} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted">
            {state === "removed" ? "The website will show a plain pattern here." : "No photo. The website shows a plain pattern."}
          </div>
        )}
      </div>
      {fileName && <p className="mt-2 truncate text-xs text-muted">Selected: {fileName}</p>}
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-700">
          {error}
        </p>
      )}

      <input ref={input} type="file" name={name} accept={ACCEPT} onChange={pick} className="sr-only" tabIndex={-1} aria-hidden />
      {removed && removeName && <input type="hidden" name={removeName} value="on" />}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-body"
        >
          {hasCurrent || preview ? "Change photo" : "Upload photo"}
        </button>
        {removeName && (hasCurrent || preview) && state !== "removed" && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-full border-[1.5px] border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Delete photo
          </button>
        )}
        {(state === "new" || state === "removed") && (
          <button type="button" onClick={undo} className="rounded-full px-3 py-2 text-sm font-medium text-muted underline-offset-2 hover:underline">
            Undo
          </button>
        )}
        {state === "current" && currentSrc && (
          <a href={currentSrc} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs font-medium text-muted hover:text-ink hover:underline">
            Open full size ↗
          </a>
        )}
      </div>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}

      <ConfirmDialog
        open={confirming}
        title="Delete this photo?"
        message="The photo will be removed from the website when you press Save. Until then you can still undo."
        confirmLabel="Yes, delete photo"
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          if (input.current) input.current.value = "";
          setPreview(null);
          setFileName("");
          setRemoved(true);
        }}
      />
    </div>
  );
}
