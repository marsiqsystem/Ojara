import type { Product } from "@/lib/mockData";

// ============================================================================
// Shop by price — the budget bands the home page offers and /collection filters
// by (?price=<key>). "Can I afford it?" answered before a shopper opens a single
// product. Bands only show when at least MIN_BAND_SIZE in-stock pieces fall in
// them, so a band never leads to an almost-empty page.
// ============================================================================

export interface PriceBand {
  key: string;
  label: string;
  min: number;
  /** Exclusive upper bound; Infinity for the top band. */
  max: number;
}

// "Under ₹X" reads as a ceiling the shopper is safe beneath — the framing an
// impulse add-on needs. The two low bands are Adorn's (stone jewellery under
// ₹800); the upper two hold the Intentions bracelets (₹899–₹1,049) and rings
// (₹1,199). Empty bands don't show, so before Adorn launches the home page
// shows just the two upper ones.
export const PRICE_BANDS: readonly PriceBand[] = [
  { key: "under-500", label: "Under ₹500", min: 0, max: 500 },
  { key: "500-799", label: "₹500 – ₹799", min: 500, max: 800 },
  { key: "800-999", label: "₹800 – ₹999", min: 800, max: 1000 },
  { key: "1000-plus", label: "₹1,000 & above", min: 1000, max: Infinity },
];

// Keys the previous bands used, still linked from shared URLs and ads.
const LEGACY_BANDS: Record<string, string> = {
  "under-950": "800-999",
  "950-1099": "1000-plus",
  "1100-plus": "1000-plus",
};

export const MIN_BAND_SIZE = 2;

export const inBand = (band: PriceBand, price: number) => price >= band.min && price < band.max;

export const bandByKey = (key: string | undefined) => {
  const k = key && (LEGACY_BANDS[key] ?? key);
  return PRICE_BANDS.find((b) => b.key === k);
};

export interface PriceBandSummary {
  band: PriceBand;
  count: number;
  fromPrice: number;
  image?: string;
}

/** Bands with enough in-stock pieces, each with its count, lowest price and a photo. */
export const summarizeBands = (products: Product[]): PriceBandSummary[] =>
  PRICE_BANDS.map((band) => {
    const pieces = products
      .filter((p) => p.stockCount > 0 && inBand(band, p.price))
      .sort((a, b) => a.price - b.price);
    return {
      band,
      count: pieces.length,
      fromPrice: pieces[0]?.price ?? 0,
      image: pieces[0]?.image,
    };
  }).filter((s) => s.count >= MIN_BAND_SIZE);
