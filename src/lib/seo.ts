import type { Metadata } from "next";

/** Public origin used for canonical URLs, Open Graph and the sitemap. Set SITE_URL in production. */
export const SITE_URL = (process.env.SITE_URL ?? "https://www.faryk.com").replace(/\/+$/, "");
export const SITE_NAME = "Friends Associates";
export const DEFAULT_OG_IMAGE = { url: "/images/og-default.jpg", width: 1200, height: 630, alt: "Friends Associates — architecture, construction and properties" };

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Per-page metadata with a canonical URL and matching Open Graph / Twitter tags.
 * Child pages replace the parent's openGraph object entirely, so the image is always set here.
 */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: SITE_NAME, type, images: [DEFAULT_OG_IMAGE], locale: "en_PK" },
    twitter: { card: "summary_large_image", title, description, images: [DEFAULT_OG_IMAGE.url] },
  };
}

/** Serialises JSON-LD safely: "<" is escaped so DB text cannot close the script tag. */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

/** Internal paths ("/x", not "//x") or https URLs only. Used to validate admin-entered button links. */
export function isSafeLink(url: string) {
  return /^\/(?![/\\])/.test(url) || /^https:\/\/[^\s]+$/.test(url);
}

/**
 * A search/link-preview description that never stops mid-word: whole text if it fits in 160 characters,
 * else up to the last full sentence, else the last whole word followed by "…".
 */
export function metaDescription(text: string | null | undefined, fallback = ""): string {
  const s = (text ?? "").replace(/\s+/g, " ").trim() || fallback;
  if (s.length <= 160) return s;
  const head = s.slice(0, 160);
  const sentence = head.match(/^.*[.!?](?=\s|$)/)?.[0];
  if (sentence && sentence.length >= 80) return sentence;
  return `${head.slice(0, 157).replace(/[\s,;:·—-]+\S*$/, "")}…`;
}

/** Home page description: a complete sentence of about 150–160 characters (Google / WhatsApp previews). */
export const HOME_DESCRIPTION =
  "Friends Associates: architecture, naqsha and NOC approvals, turnkey construction and property sales in Rahim Yar Khan, Lahore and Karachi. Call 0312-6711828.";

const DAY: Record<string, string> = { mon: "Mo", tue: "Tu", wed: "We", thu: "Th", fri: "Fr", sat: "Sa", sun: "Su" };
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function to24(t: string) {
  const m = t.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  if (m[3] === "pm" && h < 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  return h > 23 ? null : `${String(h).padStart(2, "0")}:${m[2] ?? "00"}`;
}

/**
 * Turns the admin's office-hours text ("Mon–Sat, 9am–6pm") into schema.org opening hours.
 * Anything it cannot read safely returns undefined, so Google never gets wrong hours.
 */
export function openingHoursSpec(text: string) {
  const m = text.toLowerCase().match(/^([a-z]{3})[a-z]*\s*[-–to ]+\s*([a-z]{3})[a-z]*[\s,:]+(.+?)\s*[-–]\s*(.+?)\s*$/);
  if (!m || !DAY[m[1]] || !DAY[m[2]]) return undefined;
  const opens = to24(m[3]);
  const closes = to24(m[4]);
  if (!opens || !closes) return undefined;
  const from = DAYS.indexOf(DAY[m[1]]);
  const to = DAYS.indexOf(DAY[m[2]]);
  if (to < from) return undefined;
  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].slice(from, to + 1),
    opens,
    closes,
  };
}
