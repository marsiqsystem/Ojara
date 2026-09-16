import type { Metadata } from "next";
import Hero from "@/components/Hero";
import BrandStory from "@/components/BrandStory";
import ProductGrid from "@/components/ProductGrid";
import ValueProps from "@/components/ValueProps";
import LifestyleGallery from "@/components/LifestyleGallery";
import Newsletter from "@/components/Newsletter";
import CategoryStrip from "@/components/CategoryStrip";
import GiftingSection from "@/components/GiftingSection";
import BrandTags from "@/components/BrandTags";
import ShopByPrice from "@/components/ShopByPrice";
import OfferLadderBanner from "@/components/OfferLadderBanner";
import WhatsAppClub from "@/components/WhatsAppClub";

// Self-canonical for the homepage. The root layout deliberately sets no canonical
// (see layout.tsx), so the home route declares its own here.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Home, in the order a first-time visitor needs it (the Viora rebuild): the offer
// and a price, reasons to trust, ways in (category, then the pieces, then budget),
// what more buys, gifting, the pieces in motion, why us, the story, then help.
//
// Removed: "Energy, in their own words" (ManifestationStories) quoted customers
// in Lagos, Paris and Brooklyn about a Pyrite cluster, a Chakra tree and a Jade
// coin — products OJARA doesn't sell — and "The Ojara Community" grid was stock
// photography. A real reviews wall belongs here once there are real reviews.
export default function Home() {
  return (
    <>
      <Hero />

      {/* BANNER SLOT — the owner's promo banner goes here, directly under the hero
          (owner call, 2026-09-12). Drop the <Banner /> in once the artwork is
          provided. */}
      {/* <Banner /> */}

      <BrandTags />
      <CategoryStrip />
      <ProductGrid variant="bracelets" />
      <ShopByPrice />
      <OfferLadderBanner />
      <ProductGrid variant="rings" />
      <GiftingSection />
      <LifestyleGallery />
      <ValueProps />
      <BrandStory />
      <WhatsAppClub />
      <Newsletter />
    </>
  );
}
