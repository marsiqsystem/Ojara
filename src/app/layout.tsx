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
import CookieBanner from "@/components/CookieBanner";
import LenisProvider from "@/components/LenisProvider";
import MobileBottomNav from "@/components/MobileBottomNav";
import GoogleTagManager, {
  GoogleTagManagerNoScript,
} from "@/components/analytics/GoogleTagManager";
import JsonLd from "@/components/seo/JsonLd";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  organizationSchema,
  websiteSchema,
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
  // Home page canonical; every other route sets its own (Module 6).
  alternates: { canonical: "/" },
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
        {/* Site-wide structured data for search engines + AI crawlers. */}
        <JsonLd id="ld-organization" data={organizationSchema()} />
        <JsonLd id="ld-website" data={websiteSchema()} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* GTM noscript fallback — must be first in <body> per GTM's install guide */}
        <GoogleTagManagerNoScript />
        <GoogleTagManager />
        {/* Every Wix-backed feature (auth, cart, checkout) reads the client from here */}
        <WixClientContextProvider>
          <LenisProvider>
            <AnnouncementBar />
            <Header />
            <main className="flex-1 bg-ivory">{children}</main>
            <Footer />
            <CartDrawer />
            <CheckoutModal />
            {/* Mounted once here — never per-header/nav (see AuthDrawerMount). */}
            <AuthDrawerMount />
            <EnergyGuideChat />
            <CookieBanner />
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
