import type { Metadata } from "next";
import { Cinzel, Montserrat } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { WixClientContextProvider } from "@/context/wixContext";
import Header from "@/components/Header";
import AnnouncementBar from "@/components/AnnouncementBar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import CheckoutModal from "@/components/CheckoutModal";
import AuthDrawerMount from "@/components/AuthDrawerMount";
import EnergyGuideChat from "@/components/EnergyGuideChat";
import ConsentManager from "@/components/ConsentManager";
import LenisProvider from "@/components/LenisProvider";
import ScrollToTop from "@/components/ScrollToTop";
import MobileBottomNav from "@/components/MobileBottomNav";
import { GoogleTagManagerNoScript } from "@/components/analytics/GoogleTagManager";
import { MetaPixelNoScript } from "@/components/analytics/MetaPixel";
import JsonLd from "@/components/seo/JsonLd";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  siteGraph,
} from "@/lib/seo";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["300", "400"],
  subsets: ["latin"],
});

// Search Console / Bing verification tokens (see .env). Built conditionally so an
// unset var never emits an empty <meta> tag.
const verification: Metadata["verification"] = {};
if (process.env.GOOGLE_SITE_VERIFICATION) {
  verification.google = process.env.GOOGLE_SITE_VERIFICATION;
}
if (process.env.BING_SITE_VERIFICATION) {
  verification.other = { "msvalidate.01": process.env.BING_SITE_VERIFICATION };
}

export const metadata: Metadata = {
  // Base URL for resolving relative OG/canonical/sitemap URLs to absolute ones.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "OJARA | Magnify Your Intention",
    // Child pages set a bare title (e.g. "Our Story") and this appends the brand.
    template: "%s | OJARA",
  },
  // Bracelets only — this used to advertise chakra trees, jade coins, pyrite and
  // Vastu talismans, none of which OJARA sells.
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "OJARA",
    "gemstone bracelets",
    "crystal bracelets",
    "black tourmaline bracelet",
    "evil eye bracelet",
    "citrine bracelet",
    "carnelian bracelet",
    "lapis lazuli bracelet",
    "healing crystals India",
  ],
  // NO canonical here. A root `canonical:"/"` is inherited by every child route
  // that doesn't override it and de-indexes the whole site (a bug we hit on the
  // sibling build). Each page — including the homepage (src/app/page.tsx) — sets
  // its OWN self-canonical instead.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "OJARA | Magnify Your Intention",
    description:
      "Bracelets of natural gemstones, cleansed and charged — worn as a daily reminder of your intention.",
    images: [{ url: DEFAULT_OG_IMAGE, alt: "OJARA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OJARA | Magnify Your Intention",
    description:
      "Bracelets of natural gemstones, cleansed and charged — worn as a daily reminder of your intention.",
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/logo.png",
  },
  robots: { index: true, follow: true },
  ...(Object.keys(verification).length ? { verification } : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${montserrat.variable} h-full antialiased`}
    >
      <head>
        {/* Site-wide structured data for search engines + AI crawlers —
            Organization + WebSite in one cross-linked @graph. */}
        <JsonLd id="ld-graph" data={siteGraph()} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* GTM noscript fallback — must be first in <body> per GTM's install guide */}
        <GoogleTagManagerNoScript />
        <MetaPixelNoScript />
        {/* Consent-gated trackers: mounts the GTM container (GA4 + Clarity), the
            Meta Pixel, and the route-change PageViewTracker unless the visitor has
            declined. Opt-out model — see ConsentManager. Replaces the old always-on
            CookieBanner while preserving the Meta PageView funnel fix. */}
        <ConsentManager />
        {/* Every Wix-backed feature (auth, cart, checkout) reads the client from here */}
        <WixClientContextProvider>
          <LenisProvider>
            <ScrollToTop />
            <AnnouncementBar />
            <Header />
            <main className="flex-1 bg-ivory">{children}</main>
            <Footer />
            <CartDrawer />
            <CheckoutModal />
            {/* Mounted once here — never per-header/nav (see AuthDrawerMount). */}
            <AuthDrawerMount />
            <EnergyGuideChat />
            <MobileBottomNav />
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: "#071a47",
                  color: "#f7f3eb",
                  border: "1px solid rgba(214, 175, 122, 0.4)",
                  borderRadius: "9999px",
                },
              }}
            />
          </LenisProvider>
        </WixClientContextProvider>
      </body>
    </html>
  );
}
