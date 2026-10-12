import Image from "next/image";
import { hasRealImage } from "@/lib/media";

/** File input for a project/property photo, with the current image shown when one exists. */
export function ImageField({ current, label = "Photo" }: { current?: string | null; label?: string }) {
  return (
    <div className="text-sm">
      <span className="font-medium text-stone-700">{label}</span>
      <div className="mt-1 flex flex-wrap items-center gap-4">
        {hasRealImage(current) ? (
          <Image src={current} alt="Current photo" width={160} height={100} className="h-24 w-40 rounded-md border object-cover" />
        ) : (
          <div className="flex h-24 w-40 items-center justify-center rounded-md border border-dashed text-xs text-stone-400">No photo yet</div>
        )}
        <div>
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="block text-sm" />
          <p className="mt-1 text-xs text-stone-500">JPG, PNG or WebP up to 10 MB. Resized and optimised automatically.</p>
        </div>
      </div>
    </div>
  );
}
