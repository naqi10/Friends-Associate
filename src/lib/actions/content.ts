"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HOME_BLOCK_KEYS, getHeroContent, getHeroMedia, saveContentBlock, writeAuditLog } from "@/lib/data";
import { ImageError, optionalImage, removeImage, saveImage } from "@/lib/images";
import { MEDIA_PREFIX } from "@/lib/media";
import { HERO_DEFAULTS, HERO_MEDIA_DEFAULTS } from "@/lib/content-defaults";
import { requireAdmin } from "@/lib/permissions";
import { isSafeLink } from "@/lib/seo";

const IMAGE_PATH_RE = /^\/images\/[A-Za-z0-9_\-/]+\.(jpe?g|png|webp|avif)$/;

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

/**
 * Resolves one hero photo from the form: a newly uploaded file, a "remove" request, or the current path.
 * Current paths must be an uploaded media file or an existing file in /public/images, so the hero never
 * points at something broken. An empty result shows the design's placeholder pattern on the website.
 */
async function heroPhoto(formData: FormData, field: "image" | "image2", current: string) {
  const file = optionalImage(formData, `${field}_file`);
  if (file) return { path: await saveImage(file, "content"), uploaded: true };
  if (formData.get(`${field}_remove`) === "on") return { path: "", uploaded: false };
  return { path: current, uploaded: false };
}

function photoPathOk(p: string) {
  if (p === "") return true;
  if (p.startsWith(MEDIA_PREFIX)) return /^\/api\/media\/public\/[A-Za-z0-9_\-/]+\.webp$/.test(p) && !p.includes("..");
  return IMAGE_PATH_RE.test(p) && !p.includes("..") && fs.existsSync(path.join(process.cwd(), "public", p));
}

export async function saveHeroAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const back = (code: string) => redirect(`/admin/content?error=${code}`);
  const [before, beforeMedia] = await Promise.all([getHeroContent(), getHeroMedia()]);

  const hero = {
    key: HERO_DEFAULTS.key,
    subtitle: text(formData, "subtitle", 80),
    title: text(formData, "title", 120),
    description: text(formData, "description", 400),
    imagePath: before.imagePath,
    buttonText: text(formData, "button_text", 40),
    buttonUrl: text(formData, "button_url", 300),
    secondaryButtonText: text(formData, "secondary_button_text", 40),
    secondaryButtonUrl: text(formData, "secondary_button_url", 300),
    active: formData.get("active") === "on",
  };

  if (!hero.title) back("required");
  for (const url of [hero.buttonUrl, hero.secondaryButtonUrl]) {
    if (url && !isSafeLink(url)) back("link");
  }

  let large: { path: string; uploaded: boolean };
  let small: { path: string; uploaded: boolean };
  try {
    large = await heroPhoto(formData, "image", before.imagePath);
    small = await heroPhoto(formData, "image2", beforeMedia.secondImage);
  } catch (e) {
    if (e instanceof ImageError) return back(e.code);
    throw e;
  }
  if (!photoPathOk(large.path) || !photoPathOk(small.path)) back("image");
  hero.imagePath = large.path;

  const media = {
    key: HERO_MEDIA_DEFAULTS.key,
    title: text(formData, "image_alt", 160) || HERO_MEDIA_DEFAULTS.title,
    subtitle: text(formData, "image2_alt", 160) || HERO_MEDIA_DEFAULTS.subtitle,
    imagePath: small.path,
    description: "",
    buttonText: "",
    buttonUrl: "",
    secondaryButtonText: "",
    secondaryButtonUrl: "",
    active: true,
  };

  await saveContentBlock(hero);
  await saveContentBlock(media);
  // Delete replaced uploads only after the new paths are saved (bundled /images files are never touched).
  if (before.imagePath !== large.path) await removeImage(before.imagePath);
  if (beforeMedia.secondImage !== small.path) await removeImage(beforeMedia.secondImage);
  await writeAuditLog({ userId: actor.id, action: "update", module: "content", recordId: hero.key, oldValue: { ...before, media: beforeMedia }, newValue: { ...hero, media } });

  revalidatePath("/");
  redirect("/admin/content?saved=1");
}

const EMPTY_BLOCK = {
  subtitle: "",
  description: "",
  imagePath: "",
  buttonText: "",
  buttonUrl: "",
  secondaryButtonText: "",
  secondaryButtonUrl: "",
  active: true,
};

/** Years of experience, office hours, testimonials and social links shown on the homepage and footer. */
export async function saveHomeExtrasAction(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const back = (code: string) => redirect(`/admin/content?error=${code}#home-details`);
  const k = HOME_BLOCK_KEYS;

  const social = {
    [k.social.facebook]: text(formData, "facebook", 300),
    [k.social.instagram]: text(formData, "instagram", 300),
    [k.social.youtube]: text(formData, "youtube", 300),
  };
  // Social links must be full https URLs (they open on another site).
  for (const url of Object.values(social)) if (url && !/^https:\/\/[^\s]+$/.test(url)) back("link");

  const blocks = [
    { ...EMPTY_BLOCK, key: k.years, title: text(formData, "years", 20), subtitle: "Years of experience" },
    { ...EMPTY_BLOCK, key: k.hours, title: text(formData, "hours", 60) },
    ...k.testimonials.map((key, i) => ({
      ...EMPTY_BLOCK,
      key,
      title: text(formData, `t${i + 1}_quote`, 300),
      subtitle: text(formData, `t${i + 1}_name`, 80),
      description: text(formData, `t${i + 1}_project`, 120),
    })),
    ...Object.entries(social).map(([key, url]) => ({ ...EMPTY_BLOCK, key, title: key.split(".")[1], buttonUrl: url })),
  ];
  for (const b of blocks) await saveContentBlock(b);
  await writeAuditLog({
    userId: actor.id,
    action: "update",
    module: "content",
    recordId: "home.details",
    newValue: Object.fromEntries(blocks.map((b) => [b.key, b.title || b.buttonUrl])),
  });

  revalidatePath("/", "layout");
  redirect("/admin/content?saved=home#home-details");
}
