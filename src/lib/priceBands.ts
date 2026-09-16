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

export const PRICE_BANDS: readonly PriceBand[] = [
  { key: "under-950", label: "Under ₹950", min: 0, max: 950 },
  { key: "950-1099", label: "₹950 – ₹1,099", min: 950, max: 1100 },
  { key: "1100-plus", label: "₹1,100 & above", min: 1100, max: Infinity },
];

export const MIN_BAND_SIZE = 2;

export const inBand = (band: PriceBand, price: number) => price >= band.min && price < band.max;

export const bandByKey = (key: string | undefined) => PRICE_BANDS.find((b) => b.key === key);

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
