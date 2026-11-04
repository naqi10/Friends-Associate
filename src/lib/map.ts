/**
 * Location maps for listings and projects. Admins paste whatever they have: a Google Maps link (also the
 * short "maps.app.goo.gl" share link from the phone app), the "Embed a map" code, coordinates like
 * "28.4202, 70.2952", or just an address. The website shows a Google Maps embed, which needs no API key.
 */
import { videoEmbed } from "./video";

export type MapEmbed = { embed: string; open: string };

const MAX_TEXT = 200;
const COORDS = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

function isGoogleHost(host: string) {
  return /^(www\.|maps\.)?google\.com(\.[a-z]{2})?$/.test(host);
}

/** google.com/maps/…, or maps.google.com with any path (short links often end at maps.google.com/?q=…). */
function isMapsUrl(url: URL) {
  return isGoogleHost(url.hostname) && (url.hostname.startsWith("maps.") || url.pathname.startsWith("/maps"));
}

function isShortLink(url: URL) {
  return url.hostname === "maps.app.goo.gl" || (url.hostname === "goo.gl" && url.pathname.startsWith("/maps"));
}

function fromQuery(q: string): MapEmbed {
  const query = encodeURIComponent(q.trim());
  return {
    embed: `https://www.google.com/maps?q=${query}&z=15&output=embed`,
    open: `https://www.google.com/maps/search/?api=1&query=${query}`,
  };
}

/** What to search for in a long Google Maps link: the pin's coordinates if present, else the place or search text. */
function queryOfMapsUrl(url: URL): string | null {
  const path = decodeURIComponent(url.pathname);
  // "!3d<lat>!4d<lng>" is the pin itself; "@lat,lng" is only the middle of the screen.
  const pin = url.href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pin) return `${pin[1]},${pin[2]}`;
  const q = url.searchParams.get("q") ?? url.searchParams.get("query") ?? url.searchParams.get("ll");
  if (q) return q;
  const named = path.match(/^\/maps\/(?:place|search)\/([^/]+)/);
  if (named) return named[1].replace(/\+/g, " ");
  const at = path.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return `${at[1]},${at[2]}`;
  return null;
}

/** The map to show for a saved value, or null when there is none (or it is not a map we can show). */
export function mapEmbed(raw: string): MapEmbed | null {
  const value = raw.trim();
  if (!value) return null;
  const c = value.match(COORDS);
  if (c) return Math.abs(Number(c[1])) <= 90 && Math.abs(Number(c[2])) <= 180 ? fromQuery(`${c[1]},${c[2]}`) : null;
  if (!/^https?:\/\//i.test(value)) return value.length <= MAX_TEXT && !/[<>]/.test(value) ? fromQuery(value) : null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!isMapsUrl(url)) return null;
  // "Embed a map" code from Google: already an embed address.
  if (url.pathname.startsWith("/maps/embed") && url.searchParams.get("pb")) {
    return { embed: `https://www.google.com/maps/embed?pb=${encodeURIComponent(url.searchParams.get("pb")!)}`, open: "" };
  }
  const q = queryOfMapsUrl(url);
  return q ? fromQuery(q) : null;
}

/**
 * Cleans what the admin pasted before it is saved: takes the address out of "Embed a map" code, and follows a
 * short share link to the full Google Maps link (short links cannot be shown in a page). Returns "" for an
 * empty field and null when it is not something we can show as a map.
 */
export async function normalizeMapLink(raw: string): Promise<string | null> {
  let value = raw.trim().slice(0, 2000);
  if (!value) return "";
  const iframe = value.match(/<iframe[^>]*\ssrc="([^"]+)"/i);
  if (iframe) value = iframe[1].replace(/&amp;/g, "&");

  if (/^https?:\/\//i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return null;
    }
    if (isShortLink(url)) {
      const long = await followShortLink(url.toString());
      if (!long) return null;
      value = long;
    }
  }
  return mapEmbed(value) ? value : null;
}

async function followShortLink(start: string): Promise<string | null> {
  let current = start;
  for (let hop = 0; hop < 4; hop++) {
    let res: Response;
    try {
      res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    } catch {
      return null;
    }
    const next = res.headers.get("location");
    if (!next) return null;
    current = new URL(next, current).toString();
    const host = new URL(current).hostname;
    if (isMapsUrl(new URL(current))) return current;
    if (host !== "maps.app.goo.gl" && host !== "goo.gl" && !host.endsWith("google.com")) return null;
  }
  return null;
}

/** The "Location map" and "Video" fields of a listing or project form, cleaned, or the error code for the form. */
export async function readMapAndVideo(formData: FormData): Promise<{ mapLink: string; videoUrl: string } | "map-link" | "video-link"> {
  const mapLink = await normalizeMapLink(String(formData.get("map_link") ?? ""));
  if (mapLink === null) return "map-link";
  const videoUrl = String(formData.get("video_url") ?? "").trim().slice(0, 500);
  if (videoUrl && !videoEmbed(videoUrl)) return "video-link";
  return { mapLink, videoUrl };
}
