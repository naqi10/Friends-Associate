import { hasRealImage } from "@/lib/media";
import { PhotoPicker } from "./PhotoPicker";

/**
 * Photo field for project, property, investment, team and service forms. `removeName` turns on
 * "Delete photo" for forms whose save action supports removing the photo.
 */
export function ImageField({
  current,
  label = "Photo",
  removeName,
  shape,
}: {
  current?: string | null;
  label?: string;
  removeName?: string;
  shape?: "wide" | "square" | "portrait";
}) {
  return (
    <PhotoPicker
      label={label}
      name="image"
      removeName={removeName}
      currentSrc={hasRealImage(current) ? current : null}
      shape={shape}
      hint="JPG, PNG or WebP up to 10 MB. It is resized and optimised automatically."
    />
  );
}
