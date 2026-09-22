"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/mockData";

// One catalogue fetch per page load, shared by the bag, checkout and the reels.
let catalogPromise: Promise<Product[]> | null = null;
export const loadCatalog = (): Promise<Product[]> => {
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

/** The live catalogue; empty until loaded. `enabled` defers the fetch. */
export function useCatalog(enabled = true): Product[] {
  const [catalog, setCatalog] = useState<Product[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loadCatalog().then((list) => {
      if (alive) setCatalog(list);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return catalog;
}
