"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/mockData";
import type { CouponTier } from "./pricing";
import { pickUpsellProducts } from "./bundle";
import { useAvailableTiers } from "./useAutoTierCoupon";

// One catalogue fetch per page load, shared by the bag and checkout.
let catalogPromise: Promise<Product[]> | null = null;
const loadCatalog = (): Promise<Product[]> => {
  if (!catalogPromise) {
    catalogPromise = fetch("/api/products")
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => (Array.isArray(list) ? (list as Product[]) : []))
      .catch(() => {
        catalogPromise = null; // let a later render retry
        return [];
      });
  }
  return catalogPromise;
};

export interface UpsellSuggestion {
  product: Product;
  /** The ladder step this piece alone takes the bag to, if any. */
  unlocksTier: CouponTier | null;
}

/**
 * Pieces worth adding to the bag, best first (the Viora bag/checkout pattern):
 * the cheapest pieces that on their own unlock the next ladder step, then pieces
 * from the same stone / intention family as the bag. In stock only, nothing
 * already in the bag. Empty until the catalogue has loaded.
 */
export function useUpsellSuggestions({
  subtotal,
  bag,
  limit,
}: {
  /** Products subtotal of the bag (₹). */
  subtotal: number;
  /** Products currently in the bag. */
  bag: Product[];
  limit: number;
}): UpsellSuggestion[] {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const tiers = useAvailableTiers();

  useEffect(() => {
    let alive = true;
    loadCatalog().then((list) => {
      if (alive) setCatalog(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (catalog.length === 0) return [];

  const next = tiers.find((t) => subtotal < t.minimum) ?? null;
  const bagIds = bag.map((p) => p.id);
  // The bag's anchor for relevance: its most expensive piece.
  const primary = bag.reduce<Product | undefined>(
    (best, p) => (!best || p.price > best.price ? p : best),
    undefined,
  );

  // Affinity order over every eligible piece (in stock, not in the bag).
  const ranked = pickUpsellProducts(primary, catalog, bagIds, catalog.length);

  const unlockers = next
    ? ranked
        .filter((p) => subtotal + p.price >= next.minimum)
        .sort((a, b) => a.price - b.price)
    : [];
  const rest = ranked.filter((p) => !unlockers.includes(p));

  return [...unlockers, ...rest].slice(0, limit).map((product) => ({
    product,
    unlocksTier: next && subtotal + product.price >= next.minimum ? next : null,
  }));
}
