import type { Product } from "@/lib/mockData";
import { PRICE_BANDS, bandByKey, inBand } from "@/lib/priceBands";
import { LINES, PIECE_TYPE_INFO, lineOf, pieceTypeOf, type Line, type PieceType } from "@/lib/lines";

// ============================================================================
// Shop filters + sorts — shared by /collection, /intentions, /adorn and
// /category/[slug]. Everything lives in the URL (?sort=&price=&type=&line=), so
// a filtered view can be shared, reloaded or linked from the home page.
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

/** ?type= keys are the plural slugs ("bracelets", "earrings") — old links keep working. */
const typeBySlug = (slug: string | undefined): PieceType | undefined =>
  PIECE_TYPE_INFO.find((t) => t.slug === slug)?.key;
const LINE_KEYS = Object.keys(LINES) as Line[];
const savingRate = (p: Product) =>
  p.originalPrice && p.originalPrice > p.price ? (p.originalPrice - p.price) / p.originalPrice : 0;

export interface ShopParams {
  sort: ShopSort;
  price?: string;
  type?: PieceType;
  line?: Line;
}

export interface RawShopParams {
  sort?: string;
  price?: string;
  type?: string;
  line?: string;
}

/** Read the URL's search params, ignoring anything unknown. */
export const parseShopParams = (raw: RawShopParams): ShopParams => ({
  sort: SHOP_SORTS.some((s) => s.key === raw.sort) ? (raw.sort as ShopSort) : "featured",
  price: bandByKey(raw.price)?.key,
  type: typeBySlug(raw.type),
  line: LINE_KEYS.includes(raw.line as Line) ? (raw.line as Line) : undefined,
});

/** `?sort=…&price=…&type=…&line=…` for a path, dropping defaults and empty values. */
export const shopHref = (basePath: string, params: ShopParams) => {
  const qs = new URLSearchParams();
  if (params.sort !== "featured") qs.set("sort", params.sort);
  if (params.line) qs.set("line", params.line);
  if (params.price) qs.set("price", params.price);
  if (params.type) qs.set("type", PIECE_TYPE_INFO.find((t) => t.key === params.type)?.slug ?? params.type);
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
  /** Intentions / Adorn — only on pages that mix both lines. */
  lineChips: { key: Line; label: string; count: number; active: boolean }[];
}

export const applyShopParams = (products: Product[], params: ShopParams): ShopResult => {
  const band = bandByKey(params.price);
  const byLine = params.line ? products.filter((p) => lineOf(p) === params.line) : products;
  const byType = params.type ? byLine.filter((p) => pieceTypeOf(p) === params.type) : byLine;
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

  const typeCounts = PIECE_TYPE_INFO.map((t) => ({
    key: t.key,
    label: t.plural,
    count: byLine.filter((p) => pieceTypeOf(p) === t.key).length,
    active: t.key === params.type,
  }))
    .filter((t) => t.count > 0 || t.active)
    // Biggest choice first: earrings lead on Adorn pages, bracelets on Intentions.
    .sort((a, b) => b.count - a.count);
  // Only offer the type filter when the page actually mixes kinds of piece.
  const typeChips = typeCounts.length > 1 ? typeCounts : [];

  const lineCounts = LINE_KEYS.map((key) => ({
    key,
    label: LINES[key].name,
    count: products.filter((p) => lineOf(p) === key).length,
    active: key === params.line,
  }));
  const lineChips = lineCounts.filter((l) => l.count > 0).length > 1 ? lineCounts : [];

  return {
    items: sorted,
    total: products.length,
    fromPrice: products.length ? Math.min(...products.map((p) => p.price)) : 0,
    priceChips,
    typeChips,
    lineChips,
  };
};
