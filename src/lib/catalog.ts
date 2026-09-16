import { WIX_ENABLED } from "./commerce/config";
import { matchesIntentionCollection } from "./commerce/bundle";
import {
  products as mockProducts,
  categories as mockCategories,
  getProductById as _getProductById,
  GENERIC_INTENTION,
  type Product,
  type Category,
  type IntentionSlug,
} from "@/lib/mockData";

export type { Product, Category };

// The slices of Wix's REST payloads we actually read. Wix's responses are far
// wider than this; typing only what we touch keeps the mapping honest without
// vendoring their whole schema.
type WixImage = { url?: string };
type WixMediaItem = { image?: WixImage };
type WixRawProduct = {
  id: string;
  slug?: string;
  name?: string;
  description?: string;
  collectionIds?: string[];
  collections?: { id: string }[];
  media?: { mainMedia?: WixMediaItem; items?: WixMediaItem[] };
  priceData?: { price?: number; discountedPrice?: number; originalPrice?: number };
  price?: { price?: number; discountedPrice?: number; originalPrice?: number };
  // Wix reports stock two ways depending on whether inventory tracking is on:
  // a numeric `quantity`, and/or an `inStock` flag + `inventoryStatus` string.
  // We read all of them so an out-of-stock in the Wix dashboard always wins.
  inventory?: { quantity?: number };
  stock?: { inStock?: boolean; quantity?: number; inventoryStatus?: string };
};
type WixRawCollection = {
  id: string;
  slug?: string;
  name?: string;
  description?: string;
  image?: string;
  media?: { mainMedia?: WixMediaItem };
};
// Product plus the Wix-only field we attach during mapping.
type ProductWithCollections = Product & { collectionIds?: string[] };

// Resolve a product's stock from Wix into a single number our UI reads, where
// 0 means out of stock (disables the CTAs). Priority:
//   1. An explicit out-of-stock signal (inStock === false or inventoryStatus
//      OUT_OF_STOCK) always wins — this is what the owner toggles in the Wix
//      dashboard and it must show through even if a stale quantity lingers.
//   2. A tracked numeric quantity (stock.quantity or inventory.quantity).
//   3. inStock === true with no tracked quantity → treat as available.
//   4. No Wix signal at all → the mock twin's count, else a small default.
function resolveStock(
  p: WixRawProduct,
  mockP: Product | undefined,
): number {
  const stock = p.stock;
  const qty = stock?.quantity ?? p.inventory?.quantity;

  if (stock?.inStock === false || stock?.inventoryStatus === "OUT_OF_STOCK") {
    return 0;
  }
  if (typeof qty === "number") return qty;
  if (stock?.inStock === true || stock?.inventoryStatus === "IN_STOCK") return 10;
  return mockP ? mockP.stockCount : 10;
}

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

// Decode HTML entities in plain text (named ones above, plus numeric &#39; / &#x27;).
// Unknown named entities are left as-is rather than guessed at.
const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1].toLowerCase() === "x"
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff
        ? String.fromCodePoint(n)
        : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });

// Convert a Wix product to our Product interface
function mapWixProduct(p: WixRawProduct): Product {
  // Find matching mock product to preserve metadata (intentions, benefits, type, etc.)
  const slug = p.slug || "";
  const mockP = mockProducts.find((mp) => mp.id === slug || mp.wixCatalogItemId === p.id);

  // Parse description: Wix description is usually HTML. Stripping the tags alone
  // left entities behind — 10 product pages read "Bracelet&nbsp;is" — so decode
  // the ones Wix's editor emits too.
  const rawDescription = p.description || "";
  const cleanDescription = decodeEntities(rawDescription.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();

  // Wix returns image urls either absolute or as a bare media id — normalise both.
  const toUrl = (u: string) =>
    u.startsWith("http") || u.startsWith("/")
      ? u
      : `https://static.wixstatic.com/media/${u}`;

  // Resolve main image URL
  let imageUrl = "/images/placeholder.jpg";
  if (p.media?.mainMedia?.image?.url) {
    imageUrl = toUrl(p.media.mainMedia.image.url);
  } else if (p.media?.items?.[0]?.image?.url) {
    imageUrl = toUrl(p.media.items[0].image.url);
  } else if (mockP) {
    imageUrl = mockP.image;
  }

  // The full gallery. Wix holds every uploaded shot in media.items (4 per product
  // today); previously only the main image survived this mapping and the PDP
  // padded it out with a duplicate + a stock video. Keep Wix's ordering, dedupe
  // against the main image so it can't appear twice, and fall back to [main] so
  // the gallery is never empty.
  const galleryUrls: string[] = (p.media?.items ?? [])
    .map((it) => it?.image?.url)
    .filter((u): u is string => typeof u === "string" && u.length > 0)
    .map(toUrl);
  const images = galleryUrls.length
    ? [imageUrl, ...galleryUrls.filter((u) => u !== imageUrl)]
    : [imageUrl];

  // Pricing. Wix's field names are the opposite of what they sound like:
  //
  //   dashboard "Price"              (₹1200, what's charged) -> priceData.discountedPrice
  //   dashboard "Strikethrough price"(₹2000, the "was" price) -> priceData.price
  //
  // Reading priceData.price therefore showed the STRIKETHROUGH as the sale price:
  // the PDP advertised ₹2,000 while the Wix cart line item was ₹1,200 (verified
  // against a real cart), so the site over-quoted every product by the discount.
  // discountedPrice is authoritative — it's what Wix actually bills.
  const pd = p.priceData ?? p.price ?? {};
  const selling = pd.discountedPrice ?? pd.price ?? (mockP ? mockP.price : 0);
  const list = pd.price ?? undefined;
  const price = selling;
  // Only a real markdown gets a strikethrough — equal values would render "₹1200
  // was ₹1200".
  const originalPrice =
    list != null && Number(list) > Number(selling)
      ? list
      : mockP
        ? mockP.originalPrice
        : undefined;

  return {
    id: slug || p.id,
    name: p.name || "",
    price: Number(price),
    originalPrice: originalPrice ? Number(originalPrice) : undefined,
    description: cleanDescription || (mockP ? mockP.description : ""),
    // Fallback for a Wix product with no mockData twin (today: Cats Eyes). "Sacred
    // Healing" was the old default and reads as a therapeutic claim — the brand
    // makes none. Such a product also renders with no benefit bullets and no
    // category, so it needs an entry in mockData rather than a better default.
    intention: mockP ? mockP.intention : GENERIC_INTENTION,
    benefits: mockP ? mockP.benefits : [],
    intentions: mockP ? mockP.intentions : [],
    type: mockP ? mockP.type : undefined,
    image: imageUrl,
    images,
    stockCount: resolveStock(p, mockP),
    isBundle: mockP ? mockP.isBundle : false,
    wixCatalogItemId: p.id,
    // Wix-only; carried so getProductsByCategory can filter by collection.
    collectionIds: p.collectionIds || [],
  };
}

// Single cached read of the whole catalog. Everything below filters this in
// memory rather than re-querying Wix.
//
// PERF: this used to go through wixClientServer() (OAuth), which forced a visitor
// TOKEN round-trip to Wix before every product query, on every server render, with
// no Next cache — getProductById could fire three serial requests for one page and
// navigation took 4-5s. The API key needs no token exchange, and `revalidate` lets
// Next serve repeat renders from cache. The catalog is a handful of products, so
// one cached fetch beats per-page queries at any size we'll realistically hit.
const WIX_HEADERS = () => ({
  Authorization: process.env.WIX_API_KEY!,
  "wix-account-id": process.env.WIX_ACCOUNT_ID!,
  "wix-site-id": process.env.WIX_SITE_ID!,
  "Content-Type": "application/json",
});

// Cache lifetime for catalog reads. Stock/prices tolerate a few minutes of lag;
// a real stock check happens at checkout against Wix anyway.
const CATALOG_REVALIDATE = 300;

const fetchWixProductsRaw = async (): Promise<WixRawProduct[]> => {
  const res = await fetch("https://www.wixapis.com/stores-reader/v1/products/query", {
    method: "POST",
    headers: WIX_HEADERS(),
    body: JSON.stringify({ query: { paging: { limit: 100 } } }),
    next: { revalidate: CATALOG_REVALIDATE },
  });
  if (!res.ok) {
    console.error("Wix products query failed:", res.status, await res.text());
    return [];
  }
  const body = await res.json();
  return body.products ?? [];
};

export const getAllProducts = async (): Promise<Product[]> => {
  if (!WIX_ENABLED) {
    return mockProducts;
  }

  try {
    const items = await fetchWixProductsRaw();
    if (!items.length) return mockProducts;
    return items.map(mapWixProduct);
  } catch (e) {
    console.error("Wix fetch failed, falling back to mock catalog:", e);
    return mockProducts;
  }
};

const ALLOWED_COLLECTIONS = [
  "all-products",
  "protection-evil-eye",
  "wealth-success",
  "energy-vitality",
  "calm-focus",
];

// Category tiles show a real product from that collection — Wix collections carry
// no image of their own (verified: media is empty on all five), so the previous
// build fell back to hardcoded Unsplash stock. That shipped broccoli as the
// "Wealth & Success" tile. Pulling the collection's own product photo keeps every
// tile on-brand and needs nothing uploaded to Wix.
//
// Returns collectionId -> main image url.
const fetchCollectionImages = async (): Promise<Record<string, string>> => {
  // Reuses the cached catalog read — no second network call.
  const products = await fetchWixProductsRaw();
  const byCollection: Record<string, string> = {};
  for (const p of products) {
    const url: string | undefined = p?.media?.mainMedia?.image?.url;
    if (!url) continue;
    const ids: string[] =
      p.collectionIds ?? (p.collections ?? []).map((c: { id: string }) => c.id);
    for (const id of ids) {
      // First product wins — stable ordering, no arbitrary reshuffling per build.
      if (!byCollection[id]) byCollection[id] = url;
    }
  }
  return byCollection;
};

export const getCategories = async (): Promise<Category[]> => {
  if (!WIX_ENABLED) {
    return mockCategories.filter((c) => ALLOWED_COLLECTIONS.includes(c.slug));
  }

  try {
    const res = await fetch("https://www.wixapis.com/stores-reader/v1/collections/query", {
      method: "POST",
      headers: WIX_HEADERS(),
      body: JSON.stringify({ query: {} }),
      next: { revalidate: CATALOG_REVALIDATE },
    });

    const body = await res.json();
    if (!res.ok) {
      console.error("Wix fetch collections failed:", JSON.stringify(body));
      return mockCategories.filter((c) => ALLOWED_COLLECTIONS.includes(c.slug));
    }

    const rawItems = body.collections || [];
    const items: WixRawCollection[] = rawItems.filter((col: WixRawCollection) =>
      ALLOWED_COLLECTIONS.includes(col.slug ?? ""),
    );

    // Sort to match ALLOWED_COLLECTIONS order exactly
    items.sort(
      (a, b) =>
        ALLOWED_COLLECTIONS.indexOf(a.slug ?? "") -
        ALLOWED_COLLECTIONS.indexOf(b.slug ?? ""),
    );

    // Product photo per collection, used when the collection has no image of its own.
    const collectionImages = await fetchCollectionImages();

    return items.map((col): Category & { wixCollectionId: string } => {
      // `undefined`, not `null` — Category.image is optional, and a null here was
      // only tolerated because the caller was untyped.
      let imageUrl =
        col.media?.mainMedia?.image?.url ||
        col.image ||
        collectionImages[col.id] ||
        undefined;
      if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("/")) {
        imageUrl = `https://static.wixstatic.com/media/${imageUrl}`;
      }

      return {
        slug: col.slug || col.id,
        label: col.name || "",
        title: col.name || "",
        tagline:
          col.description ||
          "Natural crystal bracelets, curated for your intentions.",
        group: col.slug === "all-products" ? "type" : "intention",
        image: imageUrl,
        wixCollectionId: col.id,
      };
    });
  } catch (e) {
    console.error("Wix fetch collections failed, falling back to mock:", e);
    return mockCategories.filter((c) => ALLOWED_COLLECTIONS.includes(c.slug));
  }
};

export const getCategoryBySlug = async (slug: string): Promise<Category | undefined> => {
  const list = await getCategories();
  return list.find((category) => category.slug === slug);
};

export const getProductById = async (id: string): Promise<Product | undefined> => {
  if (!WIX_ENABLED) {
    return _getProductById(id);
  }

  try {
    // Match by slug first (how the PDP links are built), then by raw Wix id.
    // Both resolve from the one cached catalog read — no extra round-trips.
    const items = await fetchWixProductsRaw();
    const hit =
      items.find((p) => p.slug === id) ?? items.find((p) => p.id === id);
    return hit ? mapWixProduct(hit) : _getProductById(id);
  } catch (e) {
    console.error(`Wix product fetch failed for ${id}, falling back:`, e);
    return _getProductById(id);
  }
};

export const getProductsByCategory = async (category: Category): Promise<Product[]> => {
  const all = await getAllProducts();
  
  // Wix collection members first (the owner's curation), then pieces whose stones
  // match the intention. The Wix intention collections held one piece each
  // (2026-09-16), so the category pages the home page links to were near-empty.
  const wixColId = (category as Category & { wixCollectionId?: string })
    .wixCollectionId;
  if (wixColId) {
    const inCollection = (all as ProductWithCollections[]).filter((product) =>
      product.collectionIds?.includes(wixColId),
    );
    const byStone = all.filter(
      (product) =>
        !inCollection.includes(product) &&
        matchesIntentionCollection(category.slug, product.name),
    );
    const filtered = [...inCollection, ...byStone];
    if (filtered.length > 0) return filtered;
  }

  // Fallback to static category matching
  if (category.group === "type") {
    return all.filter((product) => product.type === category.slug);
  }
  return all.filter((product) =>
    product.intentions.includes(category.slug as IntentionSlug),
  );
};
