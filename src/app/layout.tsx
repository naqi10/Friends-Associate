import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif, Noto_Nastaliq_Urdu } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ChatComingSoon } from "@/components/ChatComingSoon";
import { ChatWidget } from "@/components/ChatWidget";
import { isEnabled } from "@/lib/release";
import { Providers } from "@/components/Providers";
import { PublicChrome } from "@/components/PublicChrome";
import { DEFAULT_OG_IMAGE, HOME_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Urdu chat text. Not preloaded: browsers only download it when Urdu is actually shown.
const urdu = Noto_Nastaliq_Urdu({
  variable: "--font-nastaliq",
  weight: ["400", "600"],
  preload: false,
  display: "swap",
});

// Headings, numbers and prices in the black & white design.
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const description = HOME_DESCRIPTION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Friends Associates — Architecture, Construction & Properties",
    template: "%s | Friends Associates",
  },
  description,
  applicationName: SITE_NAME,
  keywords: [
    "Friends Associates",
    "faryk.com",
    "architect Rahim Yar Khan",
    "petrol pump NOC consultancy",
    "house plan Pakistan",
    "property Rahim Yar Khan",
    "construction company Lahore",
    "property Karachi",
    "Rahim Yar Khan plots",
    "architecture firm Pakistan",
  ],
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_PK",
    description,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: { card: "summary_large_image", images: [DEFAULT_OG_IMAGE.url] },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0e0e0e",
  // The site has one (light) design. "only light" stops Chrome's automatic dark mode from re-colouring it.
  colorScheme: "only light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${instrument.variable} ${urdu.variable} h-full antialiased`}
      // Browser extensions (Grammarly, ColorZilla, translators) add attributes here before React loads.
      // This only ignores attribute differences on these two elements, not on anything inside them.
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-canvas font-sans text-ink" suppressHydrationWarning>
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-white focus:px-3 focus:py-2"
          >
            Skip to content
          </a>
          <PublicChrome desktopOnInPortal>
            <SiteHeader />
          </PublicChrome>
          <main id="main" className="flex-1">
            {children}
          </main>
          <PublicChrome desktopOnInPortal>
            <SiteFooter />
          </PublicChrome>
          <PublicChrome>{isEnabled("chatbot") ? <ChatWidget /> : <ChatComingSoon />}</PublicChrome>
        </Providers>
      </body>
    </html>
  );
}
