"use client";

import type { Product } from "@/lib/mockData";
import { pickUpsellProducts } from "./bundle";
import { useCatalog } from "./useCatalog";
import { bagMix, offerNudges, pieceKind, type OfferNudge } from "./offers";

/** One offer the bag is close to, and the pieces that get it there. */
export interface OfferRail {
  nudge: OfferNudge;
  products: Product[];
}

export interface UpsellSuggestions {
  /** One row per offer within reach (buy 2 get 1 → bracelets, bracelet + ring → rings). */
  rails: OfferRail[];
  /** Relevant picks for when no offer is in reach (or the bag is empty). */
  picks: Product[];
}

/**
 * Pieces worth adding to the bag, best first (the Viora bag/checkout pattern):
 * for every offer the bag is close to, the pieces that complete it — more
 * bracelets for buy 2 get 1, a ring for bracelet + ring — ranked by the same
 * stone / intention family as the bag. In stock only, nothing already in the
 * bag. Empty until the catalogue has loaded.
 */
export function useUpsellSuggestions({
  bag,
  limit,
}: {
  /** Products currently in the bag, one entry per unit. */
  bag: { product: Product; quantity: number }[];
  /** Pieces per row. */
  limit: number;
}): UpsellSuggestions {
  const catalog = useCatalog();

  if (catalog.length === 0) return { rails: [], picks: [] };

  const nudges = offerNudges(
    bagMix(bag.map((b) => ({ name: b.product.name, price: b.product.price, quantity: b.quantity }))),
  );
  const bagIds = bag.map((b) => b.product.id);
  // The bag's anchor for relevance: its most expensive piece.
  const primary = bag.reduce<Product | undefined>(
    (best, b) => (!best || b.product.price > best.price ? b.product : best),
    undefined,
  );

  // Affinity order over every eligible piece (in stock, not in the bag).
  const ranked = pickUpsellProducts(primary, catalog, bagIds, catalog.length);

  const rails = nudges
    .map((nudge) => ({
      nudge,
      products: ranked.filter((p) => pieceKind(p) === nudge.add).slice(0, limit),
    }))
    .filter((r) => r.products.length > 0);

  return { rails, picks: ranked.slice(0, limit) };
}
