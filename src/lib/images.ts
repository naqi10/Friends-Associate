import { randomUUID } from "crypto";
import sharp from "sharp";
import { MEDIA_PREFIX } from "./media";
import { storage } from "./storage";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export class ImageError extends Error {
  constructor(public code: "image-size" | "image-type" | "image-storage") {
    super(code);
  }
}

/**
 * Validates an uploaded photo by decoding it, then stores a clean WebP copy:
 * max 2400px wide, EXIF/GPS stripped, orientation applied. Returns the public path for <Image src>.
 */
export async function saveImage(file: File, folder: "projects" | "properties" | "investments" | "team" | "services" | "content" | "updates"): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new ImageError("image-size");
  const input = Buffer.from(await file.arrayBuffer());
  let output: Buffer;
  try {
    output = await sharp(input, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: 2400, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new ImageError("image-type");
  }
  const focus = await findFocus(output);
  // The focal point travels in the file name, so every card can keep the subject in view without a database field.
  const key = `public/${folder}/${randomUUID()}--fp-${focus.x}-${focus.y}.webp`;
  try {
    await storage().put(key, output, "image/webp");
  } catch (e) {
    // Typically: no file storage configured on a serverless host (read-only disk). Say so instead of crashing.
    console.error("Image upload failed", e);
    throw new ImageError("image-storage");
  }
  return MEDIA_PREFIX + key;
}

/** Deletes a previously uploaded image when it is replaced. Ignores seed/static paths. */
export async function removeImage(imagePath: string | null | undefined) {
  if (imagePath?.startsWith(MEDIA_PREFIX)) await storage().remove(imagePath.slice(MEDIA_PREFIX.length));
}

/** Reads an optional <input type="file" name="image">; returns null when nothing was chosen. */
export function optionalImage(formData: FormData, name = "image"): File | null {
  const f = formData.get(name);
  return f instanceof File && f.size > 0 ? f : null;
}

/**
 * Finds the most interesting part of a photo (people, buildings, high contrast) with sharp's "attention"
 * crop, once at upload. Returns percentages used as CSS object-position, so a wide hero, a square tile
 * and a tall card all keep the subject in frame. Falls back to the centre if anything goes wrong.
 */
async function findFocus(image: Buffer): Promise<{ x: number; y: number }> {
  try {
    const { width = 0, height = 0 } = await sharp(image).metadata();
    if (!width || !height) return { x: 50, y: 50 };
    const crop = async (w: number, h: number) =>
      (await sharp(image).resize(w, h, { fit: "cover", position: sharp.strategy.attention }).toBuffer({ resolveWithObject: true })).info;
    const pct = (offset: number | undefined, window: number, full: number) =>
      Math.max(0, Math.min(100, Math.round(((Math.abs(offset ?? 0) + window / 2) / full) * 100)));
    const side = Math.min(width, height);
    const square = await crop(side, side);
    if (width >= height) {
      // Landscape: the square crop finds the subject left-right; a thin wide strip finds it top-bottom.
      const stripH = Math.max(1, Math.round(height / 2));
      const strip = await crop(width, stripH);
      return { x: pct(square.cropOffsetLeft, side, width), y: pct(strip.cropOffsetTop, stripH, height) };
    }
    const stripW = Math.max(1, Math.round(width / 2));
    const strip = await crop(stripW, height);
    return { x: pct(strip.cropOffsetLeft, stripW, width), y: pct(square.cropOffsetTop, side, height) };
  } catch {
    return { x: 50, y: 50 };
  }
}
