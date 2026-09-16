import type { Product } from "@/lib/mockData";
import { PRICE_BANDS, bandByKey, inBand } from "@/lib/priceBands";

// ============================================================================
// Shop filters + sorts — shared by /collection and /category/[slug]. Everything
// lives in the URL (?sort=&price=&type=), so a filtered view can be shared,
// reloaded or linked from the home page ("Shop by budget").
// ============================================================================

export type ShopSort = "featured" | "price-asc" | "price-desc" | "saving";

// No real order data exists to rank "most popular" honestly, so the default is
// the catalogue's own order ("Featured"), not an invented popularity.
export const SHOP_SORTS: { key: ShopSort; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "saving", label: "Biggest saving" },
];

export type PieceType = "bracelets" | "rings";

export const PIECE_TYPES: { key: PieceType; label: string }[] = [
  { key: "bracelets", label: "Bracelets" },
  { key: "rings", label: "Rings" },
];

const isRing = (p: Product) => /\bring\b/i.test(p.name);
const typeOf = (p: Product): PieceType => (isRing(p) ? "rings" : "bracelets");
const savingRate = (p: Product) =>
  p.originalPrice && p.originalPrice > p.price ? (p.originalPrice - p.price) / p.originalPrice : 0;

export interface ShopParams {
  sort: ShopSort;
  price?: string;
  type?: PieceType;
}

/** Read the URL's search params, ignoring anything unknown. */
export const parseShopParams = (raw: { sort?: string; price?: string; type?: string }): ShopParams => ({
  sort: SHOP_SORTS.some((s) => s.key === raw.sort) ? (raw.sort as ShopSort) : "featured",
  price: bandByKey(raw.price)?.key,
  type: PIECE_TYPES.some((t) => t.key === raw.type) ? (raw.type as PieceType) : undefined,
});

/** `?sort=…&price=…&type=…` for a path, dropping defaults and empty values. */
export const shopHref = (basePath: string, params: ShopParams) => {
  const qs = new URLSearchParams();
  if (params.sort !== "featured") qs.set("sort", params.sort);
  if (params.price) qs.set("price", params.price);
  if (params.type) qs.set("type", params.type);
  const s = qs.toString();
  return `${basePath}${s ? `?${s}` : ""}`;
};

export interface ShopResult {
  items: Product[];
  /** Pieces on the page before the price/type filters. */
  total: number;
  fromPrice: number;
  priceChips: { key: string; label: string; count: number; active: boolean }[];
  typeChips: { key: PieceType; label: string; count: number; active: boolean }[];
}

export const applyShopParams = (products: Product[], params: ShopParams): ShopResult => {
  const band = bandByKey(params.price);
  const byType = params.type ? products.filter((p) => typeOf(p) === params.type) : products;
  const filtered = band ? byType.filter((p) => inBand(band, p.price)) : byType;

  const sorted = [...filtered];
  if (params.sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
  if (params.sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
  if (params.sort === "saving") sorted.sort((a, b) => savingRate(b) - savingRate(a));
  // Sold-out pieces always sink to the end (stable, so the chosen order holds).
  sorted.sort((a, b) => Number(a.stockCount === 0) - Number(b.stockCount === 0));

  const priceChips = PRICE_BANDS.map((b) => ({
    key: b.key,
    label: b.label,
    count: byType.filter((p) => inBand(b, p.price)).length,
    active: b.key === band?.key,
  })).filter((c) => c.count > 0 || c.active);

  const typeCounts = PIECE_TYPES.map((t) => ({
    key: t.key,
    label: t.label,
    count: products.filter((p) => typeOf(p) === t.key).length,
    active: t.key === params.type,
  }));
  // Only offer the type filter when the page actually mixes both.
  const typeChips = typeCounts.filter((t) => t.count > 0).length > 1 ? typeCounts : [];

  return {
    items: sorted,
    total: products.length,
    fromPrice: products.length ? Math.min(...products.map((p) => p.price)) : 0,
    priceChips,
    typeChips,
  };
};
