import { WIX_ENABLED } from "./commerce/config";
import { matchesIntentionCollection } from "./commerce/bundle";
import {
  OCCASIONS,
  PIECE_TYPE_INFO,
  classifyLine,
  classifyOccasions,
  classifyPieceType,
  colourOf,
  isPieceOrOccasionCollection,
  lineOf,
  type Line,
} from "./lines";
import { ADORN_PREVIEW_ON, ADORN_PREVIEW_PRODUCTS } from "./adornPreview";
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

/**
 * Stamp a product with its line, piece type and occasions (lib/lines.ts), read
 * from its Wix collection slugs and its name.
 */
const withLine = <P extends Product>(product: P, collectionSlugs: readonly string[] = []): P => {
  const pieceType = classifyPieceType(product.name, collectionSlugs);
  const line = classifyLine(product.name, pieceType, collectionSlugs);
  // Adorn: "Hayat Jewelry Set - AQUA" shows as "Hayat Jewelry Set" with the
  // colour on the picker (owner, 2026-10-11). Orders still get both (fullNameOf).
  const split = line === "adorn" && !product.colour ? colourOf(product.name) : undefined;
  return {
    ...product,
    ...(split ? { name: split.design, colour: split.colour } : {}),
    pieceType,
    line,
    occasions: line === "adorn" ? classifyOccasions(product.name, collectionSlugs) : [],
  };
};

// Convert a Wix product to our Product interface
function mapWixProduct(p: WixRawProduct, slugById: Record<string, string> = {}): Product {
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

  const collectionIds = p.collectionIds || [];
  return withLine({
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
    collectionIds,
  }, collectionIds.map((id) => slugById[id]).filter(Boolean));
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

// Every Wix collection, cached like the products. Products only carry
// collection ids; the slugs are what tell lib/lines.ts "adorn", "earrings"…
const fetchWixCollectionsRaw = async (): Promise<WixRawCollection[]> => {
  const res = await fetch("https://www.wixapis.com/stores-reader/v1/collections/query", {
    method: "POST",
    headers: WIX_HEADERS(),
    body: JSON.stringify({ query: {} }),
    next: { revalidate: CATALOG_REVALIDATE },
  });
  if (!res.ok) {
    console.error("Wix collections query failed:", res.status, await res.text());
    return [];
  }
  const body = await res.json();
  return body.collections ?? [];
};

const collectionSlugsById = async (): Promise<Record<string, string>> => {
  try {
    const cols = await fetchWixCollectionsRaw();
    return Object.fromEntries(cols.filter((c) => c.slug).map((c) => [c.id, c.slug as string]));
  } catch {
    return {};
  }
};

const mockCatalog = (): Product[] => mockProducts.map((p) => withLine(p));

/**
 * Local preview: sample Adorn pieces after the real catalogue, only while Wix
 * has no Adorn piece of its own (lib/adornPreview.ts — never on Vercel).
 */
const withPreview = (products: Product[]): Product[] =>
  ADORN_PREVIEW_ON && !products.some((p) => lineOf(p) === "adorn")
    ? [...products, ...ADORN_PREVIEW_PRODUCTS.map((p) => withLine(p))]
    : products;

export const getAllProducts = async (): Promise<Product[]> => {
  if (!WIX_ENABLED) {
    return withPreview(mockCatalog());
  }

  try {
    const [items, slugById] = await Promise.all([fetchWixProductsRaw(), collectionSlugsById()]);
    if (!items.length) return withPreview(mockCatalog());
    return withPreview(items.map((p) => mapWixProduct(p, slugById)));
  } catch (e) {
    console.error("Wix fetch failed, falling back to mock catalog:", e);
    return withPreview(mockCatalog());
  }
};

/** One line's pieces, in catalogue order. */
export const getProductsByLine = async (line: Line): Promise<Product[]> =>
  (await getAllProducts()).filter((p) => lineOf(p) === line);

// Local mock mode only: the intention collections the site launched with.
// Live, every Wix collection the team creates becomes a category (wixCategories).
const MOCK_COLLECTIONS = [
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

// The team's Wix collections, as categories. Any collection with products shows
// up — no list to keep in sync here. A hard-coded list of five slugs hid every
// collection the team made in Wix (Bracelets, Rings, Jewellery Set…, 2026-10-14)
// and, once they deleted the old intention collections, left the home page with
// two tiles. Skipped: empty collections (a page with nothing on it), and Adorn
// piece/occasion collections ("jewellery-set", "earrings") — adornCategories
// already builds those pages from the catalogue.
const wixCategories = async (products: Product[]): Promise<Category[]> => {
  const mock = () => mockCategories.filter((c) => MOCK_COLLECTIONS.includes(c.slug));
  if (!WIX_ENABLED) return mock();

  try {
    const rawItems = await fetchWixCollectionsRaw();
    if (!rawItems.length) return mock();

    const membersOf = (id: string) =>
      (products as ProductWithCollections[]).filter((p) => p.collectionIds?.includes(id));
    const groupOf = (col: WixRawCollection): Category["group"] | undefined => {
      const slug = col.slug ?? "";
      const members = membersOf(col.id);
      if (!slug || !members.length) return undefined;
      if (slug === "all-products") return "type";
      if (members.every((p) => lineOf(p) === "adorn")) {
        return isPieceOrOccasionCollection(slug) ? undefined : "adorn";
      }
      return isPieceOrOccasionCollection(slug) ? "type" : "intention";
    };
    // All Products, then piece collections (Bracelets, Rings), then intentions,
    // then Adorn's own; Wix's order within each.
    const ORDER: Category["group"][] = ["type", "intention", "adorn"];
    const items = rawItems
      .map((col) => ({ col, group: groupOf(col) }))
      .filter((x): x is { col: WixRawCollection; group: Category["group"] } => !!x.group)
      .sort(
        (a, b) =>
          Number(b.col.slug === "all-products") - Number(a.col.slug === "all-products") ||
          ORDER.indexOf(a.group) - ORDER.indexOf(b.group),
      );

    // Product photo per collection, used when the collection has no image of its own.
    const collectionImages = await fetchCollectionImages();

    return items.map(({ col, group }): Category & { wixCollectionId: string } => {
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

      const name = (col.name || "").trim();
      return {
        slug: col.slug || col.id,
        label: name,
        title: name,
        tagline:
          col.description ||
          (group === "adorn"
            ? "Stone jewellery from OJARA Adorn."
            : "Natural crystal bracelets, curated for your intentions."),
        group,
        image: imageUrl,
        wixCollectionId: col.id,
      };
    });
  } catch (e) {
    console.error("Wix fetch collections failed, falling back to mock:", e);
    return mock();
  }
};

// Adorn pages, built from the catalogue rather than Wix collections, so a new
// pair of earrings gets an "Earrings" page the moment it's added — no setup.
const ADORN_TAGLINES: Partial<Record<string, string>> = {
  earrings: "Studs for every day, jhumkas for every festival — stone-set earrings, light on the ears and on the wallet.",
  necklace: "Fine chains, chokers and statement necklaces, set with stones that catch the light.",
  pendant: "One stone on a fine chain — the easiest gift there is.",
  set: "Necklace and earrings, already matched — the whole look in one order.",
  ring: "Solitaires and cocktail rings that catch every light.",
  bracelet: "Stone-set bracelets for a little sparkle at the wrist.",
};

const adornCategories = (products: Product[]): Category[] => {
  const adorn = products.filter((p) => lineOf(p) === "adorn");
  const cover = (list: Product[]) => (list.find((p) => p.stockCount > 0) ?? list[0])?.image;

  // Earrings first — the most-bought stone-jewellery piece, and the easiest first buy.
  const order = ["earrings", "set", "necklace", "pendant", "ring", "bracelet", "bangle", "anklet", "nose-pin"];
  const types = [...PIECE_TYPE_INFO].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  const byType = types.flatMap((t): Category[] => {
    const list = adorn.filter((p) => p.pieceType === t.key);
    if (!list.length) return [];
    // "rings" / "bracelets" are the Intentions pages; Adorn's own get a prefix.
    const slug = t.key === "ring" || t.key === "bracelet" ? `adorn-${t.slug}` : t.slug;
    return [
      {
        slug,
        label: t.plural,
        title: `Stone ${t.plural}`,
        tagline: ADORN_TAGLINES[t.key] ?? `Stone-set ${t.plural.toLowerCase()} from OJARA Adorn.`,
        group: "adorn",
        image: cover(list),
        pieceType: t.key,
      },
    ];
  });

  // Occasion pages only once there are enough pieces to fill one.
  const byOccasion = OCCASIONS.flatMap((o): Category[] => {
    const list = adorn.filter((p) => p.occasions?.includes(o.key));
    if (list.length < 2) return [];
    return [
      {
        slug: `${o.key}-jewellery`,
        label: o.label,
        title: `${o.label} Jewellery`,
        tagline: o.blurb,
        group: "adorn",
        image: cover(list),
        occasion: o.key,
      },
    ];
  });

  return [...byType, ...byOccasion];
};

/** Wix collections, with Adorn's piece and occasion pages ahead of Adorn's own collections. */
export const getCategories = async (): Promise<Category[]> => {
  const products = await getAllProducts();
  const wix = await wixCategories(products);
  const list = [
    ...wix.filter((c) => c.group !== "adorn"),
    ...adornCategories(products),
    ...wix.filter((c) => c.group === "adorn"),
  ];
  // One page per slug — a Wix collection can't shadow a built page or vice versa.
  return list.filter((c, i) => list.findIndex((d) => d.slug === c.slug) === i);
};

export const getCategoryBySlug = async (slug: string): Promise<Category | undefined> => {
  const list = await getCategories();
  return list.find((category) => category.slug === slug);
};

// A mock product, or (local preview only) a sample Adorn piece.
const localProductById = (id: string): Product | undefined => {
  const mock = _getProductById(id);
  if (mock) return withLine(mock);
  const sample = ADORN_PREVIEW_ON ? ADORN_PREVIEW_PRODUCTS.find((p) => p.id === id) : undefined;
  return sample ? withLine(sample) : undefined;
};

export const getProductById = async (id: string): Promise<Product | undefined> => {
  if (!WIX_ENABLED) {
    return localProductById(id);
  }

  try {
    // Match by slug first (how the PDP links are built), then by raw Wix id.
    // Both resolve from the one cached catalog read — no extra round-trips.
    const items = await fetchWixProductsRaw();
    const hit =
      items.find((p) => p.slug === id) ?? items.find((p) => p.id === id);
    return hit ? mapWixProduct(hit, await collectionSlugsById()) : localProductById(id);
  } catch (e) {
    console.error(`Wix product fetch failed for ${id}, falling back:`, e);
    return localProductById(id);
  }
};

export const getProductsByCategory = async (category: Category): Promise<Product[]> => {
  const catalog = await getAllProducts();

  const wixColId = (category as Category & { wixCollectionId?: string })
    .wixCollectionId;

  if (category.group === "adorn") {
    return catalog.filter(
      (p) =>
        lineOf(p) === "adorn" &&
        // An Adorn collection the team made in Wix lists its own members.
        (!wixColId || !!(p as ProductWithCollections).collectionIds?.includes(wixColId)) &&
        (!category.pieceType || p.pieceType === category.pieceType) &&
        (!category.occasion || !!p.occasions?.includes(category.occasion)),
    );
  }

  // Intentions pages list Intentions pieces only — an "Evil Eye AD Bracelet"
  // matches the protection stones by name but is fashion jewellery.
  const all = catalog.filter((p) => lineOf(p) === "intentions");

  // Wix collection members first (the owner's curation), then pieces whose stones
  // match the intention. The Wix intention collections held one piece each
  // (2026-09-16), so the category pages the home page links to were near-empty.
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
