import type { Metadata } from "next";
import Hero from "@/components/Hero";
import BrandStory from "@/components/BrandStory";
import ProductGrid from "@/components/ProductGrid";
import ValueProps from "@/components/ValueProps";
import Newsletter from "@/components/Newsletter";
import CategoryStrip from "@/components/CategoryStrip";
import GiftingSection from "@/components/GiftingSection";
import BrandTags from "@/components/BrandTags";
import ShopByPrice from "@/components/ShopByPrice";
import OffersBanner from "@/components/OffersBanner";
import WhatsAppClub from "@/components/WhatsAppClub";
import OfferCarousel from "@/components/media/OfferCarousel";
import ShoppableReels from "@/components/media/ShoppableReels";
import ComboFeature from "@/components/media/ComboFeature";
import TrustSection from "@/components/media/TrustSection";
import { reelsForTags } from "@/lib/media";

// Self-canonical for the homepage. The root layout deliberately sets no canonical
// (see layout.tsx), so the home route declares its own here.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Home, in the order a first-time visitor needs it (the Viora rebuild): the offer
// and a price, the offers as the owner's artwork, reasons to trust, ways in
// (category, then the pieces), proof (creators wearing and unboxing them, each
// reel one tap from the bag), budget, what more buys, rings + the bracelet-and-
// ring offer, gifting, confidence (certificate, packing, exchange), the story.
// Media and which offers each piece promises: lib/media.ts.
//
// Removed: "Energy, in their own words" (ManifestationStories) quoted customers
// in Lagos, Paris and Brooklyn about a Pyrite cluster, a Chakra tree and a Jade
// coin — products OJARA doesn't sell — and "The Ojara Community" grid was stock
// photography. A real reviews wall belongs here once there are real reviews.
export default function Home() {
  return (
    <>
      <Hero />


      <BrandTags />
      <CategoryStrip />
      <ProductGrid variant="bracelets" />
      <div className="bg-ivory px-4 sm:px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-[1600px]">
          {/* The owner's offer artwork, contained, after the first pieces — only
              offers the bag honours today. (Was full-bleed right under the hero;
              owner: it looked off there, 2026-09-22.) */}
          <OfferCarousel className="mb-12 sm:mb-16" />
          <ShoppableReels
            reels={reelsForTags(["wealth", "trust", "unboxing", "calm"], 10)}
            eyebrow="Watch before you buy"
            title="Unboxed, worn and explained"
            subtitle="Tap a reel to watch with sound — add the piece without leaving the video."
          />
        </div>
      </div>
      <ShopByPrice />
      <OffersBanner />
      <ProductGrid variant="rings" />
      <ComboFeature />
      <GiftingSection />
      <TrustSection />
      <ValueProps />
      <BrandStory />
      <WhatsAppClub />
      <Newsletter />
    </>
  );
}
