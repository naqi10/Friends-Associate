import { videoEmbed } from "@/lib/video";

/** A product's, listing's or project's video (YouTube, Facebook, Drive or an .mp4 link), 16:9. Nothing when there is none. */
export function ProductVideo({ url, title, heading = "Product video" }: { url: string; title: string; heading?: string }) {
  const video = url ? videoEmbed(url) : null;
  if (!video) return null;
  return (
    <section aria-label={`${title} video`}>
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">{heading}</h2>
      <div className="relative aspect-video overflow-hidden rounded-box bg-ink">
        {video.kind === "file" ? (
          <video src={video.src} controls preload="metadata" playsInline className="absolute inset-0 h-full w-full" />
        ) : (
          <iframe
            src={video.src}
            title={`${title} video`}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        )}
      </div>
    </section>
  );
}
