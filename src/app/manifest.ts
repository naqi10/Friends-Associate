import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

/** Lets phones show the site icon and name when it is added to the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: "Friends Assoc.",
    description: "Architecture, construction and properties in Rahim Yar Khan, Lahore and Karachi.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0e0e0e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
