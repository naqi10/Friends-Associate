"use client";

import { useEffect, useRef, useState } from "react";
import { focalPosition } from "@/lib/media";

const MAX_PHOTOS = 12;
const MAX_SIDE = 2000;
const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * Photos are shrunk in the browser before upload (max 2000px, JPEG). Phone photos are often 5–10 MB each and
 * the server only accepts about 4 MB per save, so a batch of photos would otherwise fail.
 */
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.84));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

type NewPhoto = { file: File; url: string };

/**
 * Extra photos of a listing or product (besides the cover photo above it). Shows the current ones with
 * Remove and ← → to change the order, and lets the admin add several at once from the phone or computer.
 * Nothing changes on the website until the form is saved.
 */
export function GalleryField({ current, label = "More photos" }: { current: string[]; label?: string }) {
  const [kept, setKept] = useState(current);
  const [added, setAdded] = useState<NewPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const picker = useRef<HTMLInputElement>(null);
  const carrier = useRef<HTMLInputElement>(null);

  // The real file input the form sends: always holds exactly the photos in `added`.
  useEffect(() => {
    if (!carrier.current) return;
    const dt = new DataTransfer();
    added.forEach((p) => dt.items.add(p.file));
    carrier.current.files = dt.files;
  }, [added]);
  useEffect(() => () => added.forEach((p) => URL.revokeObjectURL(p.url)), [added]);

  const room = MAX_PHOTOS - kept.length - added.length;

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].filter((f) => ACCEPT.split(",").includes(f.type));
    e.target.value = "";
    if (!files.length) return setNote("Please choose JPG, PNG or WebP photos.");
    setNote(files.length > room ? `Only ${Math.max(room, 0)} more photo(s) fit (${MAX_PHOTOS} at most); the rest were left out.` : "");
    setBusy(true);
    const ready = await Promise.all(files.slice(0, Math.max(room, 0)).map(shrink));
    setAdded((a) => [...a, ...ready.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    setBusy(false);
  }

  const move = (i: number, by: number) =>
    setKept((k) => {
      const j = i + by;
      if (j < 0 || j >= k.length) return k;
      const next = [...k];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const tile = "relative aspect-[4/3] overflow-hidden rounded-xl bg-ph";
  const small = "rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold text-ink shadow hover:bg-white";
  return (
    <div className="rounded-[22px] border border-line bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{label}</h3>
        <span className="text-xs text-muted">
          {kept.length + added.length} of {MAX_PHOTOS} · visitors swipe through them after the cover photo
        </span>
      </div>

      {kept.map((p) => (
        <input key={p} type="hidden" name="gallery_keep" value={p} />
      ))}
      <input ref={carrier} type="file" name="gallery_new" multiple className="sr-only" tabIndex={-1} aria-hidden />
      <input ref={picker} type="file" accept={ACCEPT} multiple onChange={pick} className="sr-only" tabIndex={-1} aria-hidden />

      {kept.length + added.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {kept.map((src, i) => (
            <li key={src} className={tile}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: focalPosition(src) }} />
              <span className="absolute inset-x-1.5 bottom-1.5 flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier" className={`${small} disabled:opacity-40`}>
                  ←
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === kept.length - 1} aria-label="Move later" className={`${small} disabled:opacity-40`}>
                  →
                </button>
                <button type="button" onClick={() => setKept((k) => k.filter((x) => x !== src))} className={`${small} ml-auto text-red-700`}>
                  Remove
                </button>
              </span>
            </li>
          ))}
          {added.map((p, i) => (
            <li key={p.url} className={`${tile} ring-2 ring-amber-400`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute top-1.5 left-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">New</span>
              <button type="button" onClick={() => setAdded((a) => a.filter((_, j) => j !== i))} className={`${small} absolute right-1.5 bottom-1.5 text-red-700`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || room <= 0}
          onClick={() => picker.current?.click()}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-body disabled:opacity-50"
        >
          {busy ? "Preparing photos…" : "Add photos"}
        </button>
        {(added.length > 0 || kept.length !== current.length || kept.some((k, i) => k !== current[i])) && (
          <span className="text-xs font-medium text-amber-900">Press Save to publish these changes.</span>
        )}
      </div>
      {note && <p className="mt-2 text-xs font-medium text-red-700">{note}</p>}
      <p className="mt-2 text-xs text-muted">Choose several photos at once. JPG, PNG or WebP; large phone photos are made smaller automatically.</p>
    </div>
  );
}
