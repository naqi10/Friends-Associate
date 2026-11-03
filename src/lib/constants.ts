export const DEMO_PASSWORD = "Faryk@2026";

/** The company's own cities, offered first in every city field. Any other city can be typed in. */
export const CITIES = ["Lahore", "Karachi", "Rahim Yar Khan"] as const;

/**
 * A typed-in city, tidied: spaces collapsed and each word capitalised ("rahim yar  khan" → "Rahim Yar Khan").
 * Returns "" when it is not a plausible city name (letters, spaces, dot, dash, apostrophe; 2–60 characters).
 */
export function cleanCity(raw: string) {
  const s = raw.trim().replace(/\s+/g, " ");
  if (s.length < 2 || s.length > 60 || !/^[\p{L}][\p{L} .'-]*$/u.test(s)) return "";
  const known = CITIES.find((c) => c.toLowerCase() === s.toLowerCase());
  return known ?? s.replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}
export const MIN_PASSWORD_LENGTH = 10;
