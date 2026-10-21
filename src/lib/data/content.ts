import { cache } from "react";
import { prisma } from "../db";
import { HERO_DEFAULTS, HERO_MEDIA_DEFAULTS } from "../content-defaults";

export type ContentBlockData = {
  key: string;
  title: string;
  subtitle: string;
  description: string;
  imagePath: string;
  buttonText: string;
  buttonUrl: string;
  secondaryButtonText: string;
  secondaryButtonUrl: string;
  active: boolean;
};

export const getHeroContent = cache(async (): Promise<ContentBlockData> => {
  const row = await prisma.contentBlock.findUnique({ where: { key: HERO_DEFAULTS.key } });
  return row ?? { ...HERO_DEFAULTS };
});

/** `badgeProjectId`: the project the large photo shows; its progress badge is drawn on the photo. Empty = no badge. */
export type HeroMedia = { mainAlt: string; secondImage: string; secondAlt: string; badgeProjectId: string };

/** Second hero photo and the alt texts for both hero photos. */
export const getHeroMedia = cache(async (): Promise<HeroMedia> => {
  const row = await prisma.contentBlock.findUnique({ where: { key: HERO_MEDIA_DEFAULTS.key } });
  const src = row ?? HERO_MEDIA_DEFAULTS;
  return { mainAlt: src.title, secondImage: src.imagePath, secondAlt: src.subtitle, badgeProjectId: "description" in src ? src.description : "" };
});

export async function saveContentBlock(data: ContentBlockData) {
  const { key, ...rest } = data;
  return prisma.contentBlock.upsert({ where: { key }, create: data, update: rest });
}

/** Keys of the small editable homepage blocks (Admin → Website content → Home page details). */
export const HOME_BLOCK_KEYS = {
  years: "home.stats.years",
  hours: "company.hours",
  testimonials: ["home.testimonial.1", "home.testimonial.2"],
  social: { facebook: "social.facebook", instagram: "social.instagram", youtube: "social.youtube" },
} as const;

export type Testimonial = { quote: string; name: string; project: string };

export type HomeExtras = {
  /** e.g. "15+" — empty until the admin fills it in. */
  years: string;
  /** e.g. "Mon–Sat, 9am–6pm". */
  hours: string;
  /** Only the filled-in testimonials. */
  testimonials: Testimonial[];
  social: { facebook: string; instagram: string; youtube: string };
};

/** One query for every homepage placeholder block. Missing rows read as empty (and are hidden). */
export const getHomeExtras = cache(async (): Promise<HomeExtras> => {
  const k = HOME_BLOCK_KEYS;
  const keys = [k.years, k.hours, ...k.testimonials, k.social.facebook, k.social.instagram, k.social.youtube];
  const rows = await prisma.contentBlock.findMany({ where: { key: { in: keys } } });
  const by = new Map(rows.map((r) => [r.key, r]));
  const testimonials = k.testimonials
    .map((key) => by.get(key))
    .filter((r): r is NonNullable<typeof r> => !!r && r.active && r.title.trim() !== "")
    .map((r) => ({ quote: r.title, name: r.subtitle, project: r.description }));
  return {
    years: by.get(k.years)?.title.trim() ?? "",
    hours: by.get(k.hours)?.title.trim() ?? "",
    testimonials,
    social: {
      facebook: by.get(k.social.facebook)?.buttonUrl ?? "",
      instagram: by.get(k.social.instagram)?.buttonUrl ?? "",
      youtube: by.get(k.social.youtube)?.buttonUrl ?? "",
    },
  };
});

/** Raw testimonial rows for the admin form (including empty ones). */
export async function getTestimonialRows() {
  const rows = await prisma.contentBlock.findMany({ where: { key: { in: [...HOME_BLOCK_KEYS.testimonials] } } });
  return HOME_BLOCK_KEYS.testimonials.map((key) => {
    const r = rows.find((x) => x.key === key);
    return { key, quote: r?.title ?? "", name: r?.subtitle ?? "", project: r?.description ?? "" };
  });
}

/** Name + progress for the hero photo badge; undefined if the project is hidden, archived or gone. */
export async function getPublicProjectBadge(id: string) {
  const p = await prisma.project.findFirst({ where: { id, published: true, archivedAt: null }, select: { name: true, progressPercent: true } });
  return p ? { name: p.name, progress_percent: p.progressPercent } : undefined;
}
