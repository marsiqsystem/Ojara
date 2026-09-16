// ============================================================================
// Product page video wall — one registry for the "customer videos" row.
//
// PLACEHOLDERS: until real customer videos come in, these are OJARA's own reels
// (public/reels/), marked source: "brand". The section heading follows the
// source, so the page never calls a brand clip a customer video:
//   • any "brand" entry  → "See it in motion"
//   • all "customer"     → "Worn by our customers"
//
// To swap in a customer video: drop a web-optimised MP4 (+ poster JPG) in
// public/reels/, replace an entry below, and set source: "customer" (and the
// customer's first name / city in `caption` only with their permission).
// ============================================================================

export type ProductVideo = {
  src: string;
  poster: string;
  alt: string;
  source: "brand" | "customer";
  caption?: string;
};

export const PRODUCT_VIDEOS: ProductVideo[] = [
  { src: "/reels/reel-1.mp4", poster: "/reels/reel-1.jpg", alt: "OJARA gemstone bracelet in motion", source: "brand" },
  { src: "/reels/reel-2.mp4", poster: "/reels/reel-2.jpg", alt: "OJARA gemstone bracelet in motion", source: "brand" },
  { src: "/reels/reel-3.mp4", poster: "/reels/reel-3.jpg", alt: "OJARA gemstone bracelet in motion", source: "brand" },
  { src: "/reels/reel-4.mp4", poster: "/reels/reel-4.jpg", alt: "OJARA gemstone bracelet in motion", source: "brand" },
];

export const productVideosHeading = (videos: ProductVideo[] = PRODUCT_VIDEOS) =>
  videos.length > 0 && videos.every((v) => v.source === "customer")
    ? { eyebrow: "Real customers", title: "Worn by our customers" }
    : { eyebrow: "Watch", title: "See it in motion" };
