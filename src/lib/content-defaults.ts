/** Fallback copy for editable content blocks, used by the seed and when a block row is missing. */
export const HERO_DEFAULTS = {
  key: "home.hero",
  subtitle: "Architecture · Construction · Properties",
  title: "Building landmarks, *from ideas* to execution.",
  description:
    "Friends Associates plans, designs and builds homes, commercial and industrial projects — from drawings and NOC approvals to construction, waterproofing and property sales — based in Rahim Yar Khan.",
  imagePath: "/images/home-hero-commercial-building.webp",
  buttonText: "Explore projects",
  buttonUrl: "/projects",
  secondaryButtonText: "View available properties",
  secondaryButtonUrl: "/properties?tab=buy",
  active: true,
} as const;

/** The second hero photo and the alt texts for both hero photos (Admin → Website content). */
export const HERO_MEDIA_DEFAULTS = {
  key: "home.hero.media",
  /** Alt text for the large hero photo. */
  title: "Five-storey commercial building with a cream stone facade, landscaped planters and a glass entrance",
  /** Alt text for the second photo. */
  subtitle: "Petrol station forecourt with fuel pumps under a lit canopy and a convenience shop",
  imagePath: "/images/home-hero-petrol-station.webp",
} as const;
