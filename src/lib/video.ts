/**
 * Video links on products, listings and projects. Admins paste a YouTube, Facebook or Google Drive link
 * (Drive: shared as "Anyone with the link"), or a direct link to an .mp4 file; the website plays it in place.
 * Anything else is refused when saving, so no other site is ever embedded.
 */
export type VideoEmbed = { kind: "youtube" | "facebook" | "drive"; src: string } | { kind: "file"; src: string };

export function videoEmbed(raw: string): VideoEmbed | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  const yt =
    host === "youtu.be" ? url.pathname.slice(1) : host === "youtube.com" ? (url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1]) : null;
  if (yt && /^[\w-]{6,20}$/.test(yt)) return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0` };
  if (host === "facebook.com" || host === "fb.watch") {
    return { kind: "facebook", src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.toString())}&show_text=false` };
  }
  if (host === "drive.google.com") {
    const id = url.pathname.match(/^\/file\/d\/([\w-]{10,})/)?.[1] ?? url.searchParams.get("id");
    if (id && /^[\w-]{10,}$/.test(id)) return { kind: "drive", src: `https://drive.google.com/file/d/${id}/preview` };
  }
  if (/\.mp4$/i.test(url.pathname)) return { kind: "file", src: url.toString() };
  return null;
}
