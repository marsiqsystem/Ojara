import type { Metadata } from "next";
import Hero from "@/components/Hero";
import BrandStory from "@/components/BrandStory";
import ProductGrid from "@/components/ProductGrid";
import ValueProps from "@/components/ValueProps";
import LifestyleGallery from "@/components/LifestyleGallery";
import ManifestationStories from "@/components/ManifestationStories";
import Newsletter from "@/components/Newsletter";
import SocialProofGrid from "@/components/SocialProofGrid";
import CategoryStrip from "@/components/CategoryStrip";
import GiftingSection from "@/components/GiftingSection";
import BrandTags from "@/components/BrandTags";

// Self-canonical for the homepage. The root layout deliberately sets no canonical
// (see layout.tsx), so the home route declares its own here.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <Hero />

      {/* BANNER SLOT — the owner's promo banner goes here, between the hero video
          and the reel (owner call, 2026-09-12). Drop the <Banner /> in once the
          artwork is provided. Order is intentionally: hero → banner → reel. */}
      {/* <Banner /> */}

      <LifestyleGallery />
      <ProductGrid variant="bracelets" />
      <BrandStory />
      <ProductGrid variant="rings" />
      <BrandTags />
      <ValueProps />
      <GiftingSection />
      <CategoryStrip />
      <ManifestationStories />
      <SocialProofGrid />
      <Newsletter />
    </>
  );
}
