/** Client-safe helpers for image paths (no Node-only imports). */
export const MEDIA_PREFIX = "/api/media/";

const STATIC_IMAGE_RE = /^\/images\/[A-Za-z0-9_\-/]+\.(webp|avif|jpe?g|png)$/;

/**
 * Uploaded media, or a bundled file under /images. Paths that point at missing files are cleared
 * from the database by the content migration, so anything matching here really exists.
 */
export function hasRealImage(imagePath: string | null | undefined): imagePath is string {
  return !!imagePath && (imagePath.startsWith(MEDIA_PREFIX) || (STATIC_IMAGE_RE.test(imagePath) && !imagePath.includes("..")));
}

/**
 * CSS object-position for an uploaded photo, from the focal point found at upload ("…--fp-62-35.webp").
 * Photos without one (bundled images, older uploads) use the given fallback, or the centre.
 */
export function focalPosition(imagePath: string | null | undefined, fallback?: string): string | undefined {
  const m = imagePath?.match(/--fp-(\d{1,3})-(\d{1,3})\.webp$/);
  return m ? `${m[1]}% ${m[2]}%` : fallback;
}
