"use client";

import type { Product } from "@/lib/mockData";
import { pickUpsellProducts } from "./bundle";
import { useCatalog } from "./useCatalog";
import { BUY2GET1_LIVE, bagMix, offerLineOf, offerNudges, pieceKind, type OfferNudge } from "./offers";
import { formatPrice } from "@/lib/format";
import { colourSiblings, lineOf, pieceTypeOf } from "@/lib/lines";

/** One offer the bag is close to, and the pieces that get it there. */
export interface OfferRail {
  nudge: OfferNudge;
  products: Product[];
}

/**
 * "Complete the look" — the other line, for a bag that holds only one. Not an
 * offer (nothing is discounted), so it never claims one: it sells the pairing.
 */
export interface LookRail {
  title: string;
  subtitle: string;
  products: Product[];
}

export interface UpsellSuggestions {
  /** One row per offer within reach (buy 2 get 1 → bracelets, bracelet + ring → rings). */
  rails: OfferRail[];
  /** The cross-line pairing row, when the bag holds only one line. */
  look: LookRail | null;
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

  if (catalog.length === 0) return { rails: [], look: null, picks: [] };

  const mix = bagMix(bag.map((b) => offerLineOf(b.product, b.quantity)));
  const nudges = offerNudges(mix);
  const bagIds = bag.map((b) => b.product.id);
  // The bag's anchor for relevance: its most expensive piece.
  const primary = bag.reduce<Product | undefined>(
    (best, b) => (!best || b.product.price > best.price ? b.product : best),
    undefined,
  );

  // Affinity order over every eligible piece (in stock, not in the bag).
  const ranked = pickUpsellProducts(primary, catalog, bagIds, catalog.length);

  // Adorn's buy 2 get 1: other colours of the sets already in the bag lead
  // ("Which one should I order? All of them").
  const siblingIds = new Set(
    bag.flatMap((b) => colourSiblings(b.product, catalog)).map((p) => p.id),
  );
  const rails = nudges
    .map((nudge) => {
      const pool = ranked.filter((p) => pieceKind(p) === nudge.add);
      const ordered =
        nudge.add === "adorn"
          ? [...pool.filter((p) => siblingIds.has(p.id)), ...pool.filter((p) => !siblingIds.has(p.id))]
          : pool;
      return { nudge, products: ordered.slice(0, limit) };
    })
    .filter((r) => r.products.length > 0);

  return { rails, look: lookRail(mix, ranked, limit), picks: ranked.slice(0, limit) };
}

// Earrings first: the easiest yes next to a bracelet (no size, any outfit).
const ADD_ON_ORDER = ["earrings", "pendant", "necklace", "set", "ring", "bracelet"];

const lookRail = (
  mix: ReturnType<typeof bagMix>,
  ranked: Product[],
  limit: number,
): LookRail | null => {
  const intentionsInBag = mix.bracelets + mix.rings;
  if (intentionsInBag > 0 && mix.adorn === 0) {
    const adorn = ranked
      .filter((p) => lineOf(p) === "adorn")
      .sort(
        (a, b) =>
          ADD_ON_ORDER.indexOf(pieceTypeOf(a)) - ADD_ON_ORDER.indexOf(pieceTypeOf(b)) || a.price - b.price,
      );
    if (!adorn.length) return null;
    const from = Math.min(...adorn.map((p) => p.price));
    return {
      title: `Complete the look — stone jewellery from ${formatPrice(from)}`,
      subtitle: "Stone jewellery to wear with it. Same order, same free delivery.",
      products: adorn.slice(0, limit),
    };
  }
  if (mix.adorn > 0 && intentionsInBag === 0) {
    const bracelets = ranked.filter((p) => pieceKind(p) === "bracelet");
    if (!bracelets.length) return null;
    const from = Math.min(...bracelets.map((p) => p.price));
    return {
      title: `Add a gemstone bracelet — from ${formatPrice(from)}`,
      subtitle: BUY2GET1_LIVE
        ? "Natural stones, worn with meaning. Buy 2 bracelets, get 1 free."
        : "Natural stones, worn with meaning. Same order, same free delivery.",
      products: bracelets.slice(0, limit),
    };
  }
  return null;
};
