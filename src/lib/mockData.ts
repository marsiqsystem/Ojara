// Shoppers arrive by *intention* ("I need money luck", "shield my aura")
// or by *stone* ("citrine bracelet"). Both are modelled so /category/[slug] can
// serve either entry point from the same product list.
export type IntentionSlug = "protection" | "wealth" | "vitality" | "focus";

export type TypeSlug =
  | "tourmaline"
  | "carnelian"
  | "citrine"
  | "lapis-lazuli";

export type CategorySlug = IntentionSlug | TypeSlug;

/**
 * The brand line a Wix product gets as its `intention` when it has no curated
 * twin below (see catalog.ts) — 22 of the 27 live products today. It's a tagline,
 * not a real intention, so the PDP must not dress it up as one ("The Intention:
 * Wear Your Intention… a daily reminder to wear your intention").
 */
export const GENERIC_INTENTION = "Wear Your Intention";

/** True when the product carries a real, curated intention (not the brand line). */
export const hasSpecificIntention = (product: Pick<Product, "intention">): boolean =>
  !!product.intention && product.intention !== GENERIC_INTENTION;

export interface Product {
  id: string;
  name: string;
  // Whole rupees. Rendered via formatPrice() so grouping stays Indian (₹1,29,999).
  price: number;
  // When set, the pre-discount price — rendered struck-through beside `price`.
  originalPrice?: number;
  description: string;
  // Headline intention, shown as the card badge and on the PDP.
  intention: string;
  // Scannable outcome promises — the reason to buy, as bullets on the PDP.
  benefits: string[];
  // Intention categories this piece belongs to.
  intentions: IntentionSlug[];
  // Stone type category.
  type?: TypeSlug;
  image: string;
  // Every gallery image, in Wix's ordering (image[0] === `image`, the main one).
  // Populated from Wix media.items in live mode; in mock mode it falls back to
  // the single `image` so the PDP gallery always has at least one entry.
  images?: string[];
  // Units on hand. Small-batch numbers (2–15) power authentic scarcity cues.
  stockCount: number;
  // Marks curated multi-piece sets so the UI can badge them distinctly.
  isBundle?: boolean;
  // The Wix Stores catalog GUID, captured when the product is seeded into Wix.
  wixCatalogItemId?: string;
  // Wix collection GUIDs this product belongs to. Populated only in live mode
  // (catalog.ts), and used to resolve /category/[slug] against Wix collections.
  // Was previously bolted on behind a @ts-ignore, which hid the fact that it
  // wasn't on the type at all.
  collectionIds?: string[];
}

export interface Category {
  // In mock mode this is a CategorySlug ("protection", "citrine", ...). In live
  // mode it's whatever slug Wix's collection carries ("protection-evil-eye",
  // "wealth-success", "all-products"), which is a DIFFERENT set — so this can't
  // be narrowed to CategorySlug without lying about live data.
  slug: CategorySlug | string;
  // Menu label — short, for the Shop dropdown.
  label: string;
  // Page heading — the fuller, search-intent-matching phrasing.
  title: string;
  tagline: string;
  group: "intention" | "type";
  // Representative product image for the category strip on the home page.
  image?: string;
}

// Drives both the Shop mega menu and the /category/[slug] routes.
//
// COPY RULE (client, 2026-07-17): OJARA sells natural gemstone bracelets. There is
// no magnet in the product, so nothing here may reference magnetic/bio-magnetic
// fields or "therapy". Nor may it promise a physical or psychological effect —
// "boost stamina", "clear fatigue", "soothe anxiety", "circulation" are health
// claims we cannot make (and ASCI would not allow). Write intention and tradition:
// what the stone is *worn as*, not what it does to the body. See /terms.
export const categories: Category[] = [
  {
    slug: "protection",
    label: "Protection & Evil Eye",
    title: "Protection & Evil Eye — Shield Your Aura",
    tagline:
      "Black Tourmaline and evil eye bracelets, worn in the old tradition of turning away nazar and keeping your energy your own.",
    group: "intention",
    image: "/images/category-protection.jpg",
  },
  {
    slug: "wealth",
    label: "Wealth & Success",
    title: "Wealth & Success",
    tagline:
      "Citrine, long called the merchant's stone — worn as a daily reminder of the abundance you are working toward.",
    group: "intention",
    image: "/images/category-wealth.jpg",
  },
  {
    slug: "vitality",
    label: "Energy & Vitality",
    title: "Energy & Vitality",
    tagline:
      "Carnelian, the stone of warmth and courage — for the days you want to feel bold and begin again.",
    group: "intention",
    image: "/images/category-vitality.jpg",
  },
  {
    slug: "focus",
    label: "Calm & Focus",
    title: "Calm & Focus",
    tagline:
      "Lapis Lazuli, the deep blue stone of truth and clarity — a quiet anchor for a busy mind.",
    group: "intention",
    image: "/images/category-focus.jpg",
  },
  // Stones
  {
    slug: "tourmaline",
    label: "Black Tourmaline",
    title: "Black Tourmaline Bracelets",
    tagline:
      "The grounding stone, traditionally worn as a shield against buri nazar.",
    group: "type",
    image: "/images/category-protection.jpg",
  },
  {
    slug: "carnelian",
    label: "Carnelian",
    title: "Carnelian Bracelets",
    tagline:
      "A bold, warm stone long tied to creative fire, courage, and vitality.",
    group: "type",
    image: "/images/category-vitality.jpg",
  },
  {
    slug: "citrine",
    label: "Citrine",
    title: "Citrine Bracelets",
    tagline:
      "The merchant stone of wealth, abundance, and joy.",
    group: "type",
    image: "/images/category-wealth.jpg",
  },
  {
    slug: "lapis-lazuli",
    label: "Lapis Lazuli",
    title: "Lapis Lazuli Bracelets",
    tagline:
      "The deep blue stone of truth, wisdom, and intellectual focus, steadying an overactive mind.",
    group: "type",
    image: "/images/category-focus.jpg",
  },
];

export const products: Product[] = [
  {
    id: "black-tourmaline-evil-eye",
    name: "Black Tourmaline Evil Eye Bracelet",
    price: 1899,
    description:
      "Authentic Black Tourmaline beads strung with a traditional evil eye — worn to turn away nazar and keep your own energy close.",
    intention: "Ward Off Negativity",
    benefits: [
      "Worn in the old tradition of turning away nazar and buri nazar",
      "Black Tourmaline, long kept as a grounding stone",
      "Natural hand-finished beads, cleansed before dispatch",
    ],
    intentions: ["protection"],
    type: "tourmaline",
    image: "https://static.wixstatic.com/media/f059b5_59c041cbd5954992bdddcde5f2faf0ab~mv2.png",
    stockCount: 5,
    wixCatalogItemId: "eac41b3f-0e3f-4c7b-a5a3-a9bbf3f8bb2c",
  },
  {
    id: "citrine-bracelet",
    name: "Citrine Bracelet",
    price: 1999,
    description:
      "Vibrant natural Citrine — long called the merchant's stone, worn as a daily reminder of the abundance you are building.",
    intention: "Attract Wealth",
    benefits: [
      "Citrine, traditionally the merchant's stone of abundance",
      "A daily reminder of the opportunity you are working toward",
      "Natural hand-finished beads, cleansed before dispatch",
    ],
    intentions: ["wealth"],
    type: "citrine",
    image: "https://static.wixstatic.com/media/f059b5_26dcab2dfc554c99913cda28b3ba1a9a~mv2.png",
    stockCount: 12,
    wixCatalogItemId: "91750104-9bb9-4fbc-8cc9-24f99cb34dde",
  },
  {
    id: "carnelian-bracelet",
    name: "Carnelian Bracelet",
    price: 1799,
    description:
      "Warm Carnelian beads — the stone of courage and creative fire, for the days you want to feel bold.",
    intention: "Energy & Vitality",
    benefits: [
      "Carnelian, long tied to courage and creative fire",
      "For the days you want to feel bold and begin again",
      "Natural hand-finished beads, cleansed before dispatch",
    ],
    intentions: ["vitality"],
    type: "carnelian",
    image: "https://static.wixstatic.com/media/f059b5_10d78768f66d4c50a9d630ce50dfa4f4~mv2.png",
    stockCount: 7,
    wixCatalogItemId: "3ca369d0-5813-48d0-b7ac-423bb673238b",
  },
  {
    id: "lapis-lazuli-bracelet",
    name: "Lapis Lazuli Bracelet",
    price: 1899,
    description:
      "Deep blue Lapis Lazuli beads — the stone of truth and clarity, a quiet anchor for a busy mind.",
    intention: "Calm & Focus",
    benefits: [
      "Lapis Lazuli, the old stone of truth and wisdom",
      "A quiet anchor to return to on a busy day",
      "Natural hand-finished beads, cleansed before dispatch",
    ],
    intentions: ["focus"],
    type: "lapis-lazuli",
    image: "https://static.wixstatic.com/media/f059b5_985f7bc64682498ca1ffc548a0fd14c6~mv2.png",
    stockCount: 6,
    wixCatalogItemId: "5177db65-d3a1-46c5-b614-57b1969b9b1a",
  },
];

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

// Intention categories match against `intentions`; stone categories against `type`.
export function getProductsByCategory(category: Category): Product[] {
  if (category.group === "type") {
    return products.filter((product) => product.type === category.slug);
  }
  return products.filter((product) =>
    product.intentions.includes(category.slug as IntentionSlug),
  );
}
