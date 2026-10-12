import { randomUUID } from "crypto";
import sharp from "sharp";
import { MEDIA_PREFIX } from "./media";
import { storage } from "./storage";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export class ImageError extends Error {
  constructor(public code: "image-size" | "image-type") {
    super(code);
  }
}

/**
 * Validates an uploaded photo by decoding it, then stores a clean WebP copy:
 * max 2400px wide, EXIF/GPS stripped, orientation applied. Returns the public path for <Image src>.
 */
export async function saveImage(file: File, folder: "projects" | "properties" | "investments"): Promise<string> {
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
  const key = `public/${folder}/${randomUUID()}.webp`;
  await storage().put(key, output, "image/webp");
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
