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
