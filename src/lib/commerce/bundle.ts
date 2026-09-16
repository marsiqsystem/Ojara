// ============================================================================
// Sacred Bundle — the checkout upsell ladder.
//
// Pure module: no React, no Wix, no DOM. The component renders it, the checkout
// prices it, and /api/checkout reconciles it onto the real Wix order. Keeping
// the math here is what stops the UI and the invoice from drifting apart —
// see the ⚠️ DRIFT note at the top of pricing.ts.
//
// HOW THE MONEY WORKS (read before changing a tier):
//   The tier rate applies to the value of the UPSELL ITEMS ONLY, never to the
//   whole cart. The shopper's original item keeps its price. So "30% OFF" means
//   30% off the three pieces they just added, not 30% off everything — which is
//   both the honest reading of "complete the bundle and save" and the only
//   version whose margin survives a ₹1,049 anchor item.
//
//   The resulting rupee figure is passed to /api/checkout as `bundleDiscount`
//   and written onto the Wix draft order as a GLOBAL custom discount, the same
//   mechanism the prepaid −₹50 uses. Wix therefore bills exactly what the UI
//   promised.
// ============================================================================

import type { Product } from "@/lib/mockData";

/** How many upsell slots the ladder has. Progress bar + tiers assume 3. */
export const BUNDLE_SLOTS = 3;

export interface BundleTier {
  /** Number of upsell items this tier requires. */
  count: number;
  /** Share off the upsell items, as a rate (0.3 = 30%). */
  rate: number;
  /** Badge copy on the progress bar checkpoint. */
  label: string;
  /** The nudge shown while this tier is still locked. */
  teaser: string;
}

// Tiers are cumulative-by-count, not additive: reaching 2 items sets the rate to
// 15% outright (the "extra 5%" the copy promises), reaching 3 sets it to 30%.
export const BUNDLE_TIERS: readonly BundleTier[] = [
  {
    count: 1,
    rate: 0.1,
    label: "10% OFF",
    teaser: "Add one piece to unlock 10% off your ritual",
  },
  {
    count: 2,
    rate: 0.15,
    label: "15% OFF",
    teaser: "Add a second to deepen it — 5% more, 15% in all",
  },
  {
    count: 3,
    rate: 0.3,
    label: "30% OFF",
    teaser: "Add the last piece to complete your harmony",
  },
];

/** The tier unlocked by `count` added items, or undefined below the first. */
export const tierFor = (count: number): BundleTier | undefined =>
  [...BUNDLE_TIERS].reverse().find((t) => count >= t.count);

/** Discount rate currently unlocked. 0 when nothing has been added. */
export const bundleRate = (count: number): number => tierFor(count)?.rate ?? 0;

/**
 * Rupees off, given the upsell items chosen. Rounded to whole rupees so the
 * figure the shopper reads is the figure sent to Wix — no floating-point tail.
 */
export const bundleDiscountFor = (upsells: Product[]): number => {
  const gross = upsells.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  return Math.round(gross * bundleRate(upsells.length));
};

// ---------------------------------------------------------------------------
// Relevance matching
// ---------------------------------------------------------------------------

// Affinity groups. A cart item and a candidate that share a group are
// "relevant" to each other. Terms are matched as lowercase substrings against
// the product name, so a piece added in Wix with no mockData twin still lands
// in a group. Mirrors the badge vocabulary in ProductCard so the suggestions
// read as a continuation of what the shopper already chose.
const AFFINITY_GROUPS: ReadonlyArray<readonly string[]> = [
  // Body & wellbeing rituals — the group the brief's "weight → PCOD / health"
  // example describes.
  ["weight", "pcod", "pcos", "health", "wellness", "anti-depression", "depression", "moonstone", "pearl"],
  // Protection
  ["evil eye", "nazar", "black tourmaline", "obsidian", "onyx", "shungite", "hematite", "protect"],
  // Wealth
  ["citrine", "pyrite", "wealth", "money", "abundance", "prosper", "aventurine", "jade"],
  // Calm & clarity
  ["amethyst", "lepidolite", "howlite", "selenite", "clear quartz", "calm", "focus", "sleep", "clarity"],
  // Love & harmony
  ["rose quartz", "rhodonite", "kunzite", "love", "harmony"],
  // Energy & courage
  ["carnelian", "tiger eye", "tiger's eye", "garnet", "red jasper", "sunstone", "lava", "chakra", "energy", "vitality", "confidence"],
];

const groupsFor = (name: string): number[] => {
  const n = name.toLowerCase();
  return AFFINITY_GROUPS.reduce<number[]>((hits, terms, i) => {
    if (terms.some((t) => n.includes(t))) hits.push(i);
    return hits;
  }, []);
};

/** How many pieces the product page's "Complete your ritual" row offers. */
export const RITUAL_PAIR_COUNT = 4;

/**
 * The pieces the product page pairs with `product` ("Complete your ritual"):
 * same stone / intention family first, in stock only. "You May Also Like" uses
 * it too, to avoid repeating them.
 */
export const ritualPairsFor = (product: Product, catalog: Product[]): Product[] =>
  pickUpsellProducts(product, catalog, [product.id], RITUAL_PAIR_COUNT);

/**
 * Three upsell candidates for the shopper's primary item.
 *
 * Ranked: shared affinity group first, then the rest of the catalogue so the
 * rail is never short. Anything already in the cart is excluded — offering a
 * shopper the thing they just bought is the fastest way to lose the sale.
 */
export const pickUpsellProducts = (
  primary: Product | undefined,
  catalog: Product[],
  cartIds: string[] = [],
  limit: number = BUNDLE_SLOTS,
): Product[] => {
  const excluded = new Set(cartIds);
  const pool = catalog.filter((p) => !excluded.has(p.id) && p.stockCount > 0);
  if (!primary) return pool.slice(0, limit);

  const primaryGroups = new Set(groupsFor(primary.name));

  const scored = pool.map((p) => {
    const shared = groupsFor(p.name).filter((g) => primaryGroups.has(g)).length;
    return { product: p, shared };
  });

  // Stable ordering: relevance desc, then catalogue order. A stable sort keeps
  // the rail from reshuffling between renders.
  scored.sort((a, b) => b.shared - a.shared);
  return scored.slice(0, limit).map((s) => s.product);
};
