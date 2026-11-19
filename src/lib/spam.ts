/**
 * Website-form spam rules. Bots post within a second of loading a page, often in scripts no customer here uses
 * (Russian, Chinese…), with links in the name. Customers write English or Urdu and take a few seconds.
 */
const FOREIGN_SCRIPT = /[Ѐ-ӿ֐-׿฀-๿぀-ヿ㐀-鿿가-힯]/;
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(ru|cn|xyz|top|site|online|shop|info|biz)\b)/gi;
const MIN_FILL_MS = 3000;
const MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000;

/** "too-fast" / "stale" from the form's timer (see FormTimer), "missing" when the browser never ran it, or null. */
export function formTimerProblem(raw: string, now = Date.now()): "missing" | "too-fast" | "stale" | null {
  if (!/^\d{13}$/.test(raw)) return "missing";
  const age = now - Number(raw);
  if (age < MIN_FILL_MS) return "too-fast";
  if (age > MAX_AGE_MS) return "stale";
  return null;
}

/** True when what was typed looks like a bot: a foreign script anywhere, a link in a short field, or a message full of links. */
export function looksLikeSpam(fields: { name: string; city?: string; email?: string; message?: string; other?: string[] }): boolean {
  const all = [fields.name, fields.city ?? "", fields.message ?? "", ...(fields.other ?? [])].join(" ");
  if (FOREIGN_SCRIPT.test(all)) return true;
  if (!/[a-z؀-ۿ]/i.test(fields.name)) return true;
  if ((fields.name + " " + (fields.city ?? "")).match(LINK)) return true;
  return (fields.message ?? "").match(LINK)?.length ? (fields.message ?? "").match(LINK)!.length >= 2 : false;
}
