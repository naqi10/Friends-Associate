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

/**
 * Editable heading + intro for each public page (Admin → Website content → Page headings).
 * Defaults are the original wording, so a page looks the same until the admin changes it.
 * An empty intro hides the paragraph.
 */
export const PAGE_CONTENT = {
  "page.about": {
    label: "About us",
    path: "/about",
    title: "About Friends Associates",
    intro: "Architecture, construction and property services from our head office in Rahim Yar Khan, with teams in Lahore and Karachi.",
  },
  "page.architecture": {
    label: "Architecture",
    path: "/architecture",
    title: "Architecture",
    intro: "Planning, architectural and structural drawings, estimation and approvals for every kind of building.",
  },
  "page.construction": {
    label: "Construction",
    path: "/construction",
    title: "Construction",
    intro: "Grey structure to turnkey construction, renovation, waterproofing and construction chemicals.",
  },
  "page.projects": { label: "Projects", path: "/projects", title: "Projects", intro: "" },
  "page.properties": { label: "Properties", path: "/properties", title: "Properties", intro: "" },
  "page.properties.sell": {
    label: "Properties → Sell your property box",
    path: "/properties?tab=sell",
    title: "Sell or rent out your property",
    intro:
      "Share a few details and our property team will contact you to value, list and market it — plots, houses, apartments, shops and commercial buildings.",
  },
  "page.investment": {
    label: "Investment",
    path: "/investment",
    title: "Investment opportunities",
    intro:
      "Partner with Friends Associates in developing plazas, residential homes, shops and markets. Choose a project to see the minimum investment, timeline and how returns are shared, then register your interest.",
  },
  "page.progress": {
    label: "Project progress",
    path: "/progress",
    title: "Project progress",
    intro: "Each project shows its stages with the percentage completed, updated by our project managers.",
  },
  "page.documents": {
    label: "Documents",
    path: "/documents",
    title: "Public documents",
    intro: "Buyer-specific files are available after login in the portal.",
  },
  "page.news": { label: "News & updates", path: "/news", title: "News & updates", intro: "" },
  "page.contact": {
    label: "Contact us",
    path: "/contact",
    title: "Contact us",
    intro: "Tell us about your project — we usually reply the same day.",
  },
} as const;
export type PageContentKey = keyof typeof PAGE_CONTENT;

/** About page lists: one item per line in the admin form. */
export const ABOUT_LISTS = {
  "about.values": {
    title: "Core values",
    items: [
      "Honest advice and written agreements",
      "Supervised workmanship and quality materials",
      "Progress our clients can see, stage by stage",
      "Respect for every client's budget and time",
    ],
  },
  "about.why": {
    title: "Why choose Friends Associates",
    items: [
      "Drawings, NOC and approvals handled by our own team",
      "Construction, waterproofing and property sales under one roof",
      "Customer portal with payments, documents and progress",
      "Offices in Rahim Yar Khan, Lahore and Karachi",
    ],
  },
} as const;
export type AboutListKey = keyof typeof ABOUT_LISTS;

/** FAQ rows are content blocks whose key starts with this prefix. */
export const FAQ_PREFIX = "faq.";
