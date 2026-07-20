"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Product } from "@/lib/mockData";

// The live catalog, resolved once on the server (catalog.getAllProducts →
// Wix when WIX_ENABLED, mock otherwise) and handed to the client tree here.
//
// Why this exists: client components like RecentlyViewed only persist a product
// *id* in localStorage, then need the current name/price/image to render it. They
// can't call the async, server-only catalog reader, so before this they imported
// mockData.getProductById and showed the hardcoded mock price (₹1,899 …) even when
// Wix was live and the real price had changed. Reading from this context instead
// means recently-viewed (and any future id-only client feature) shows the same
// live Wix price as the rest of the site.
const CatalogContext = createContext<Product[]>([]);

export function CatalogProvider({
  products,
  children,
}: {
  products: Product[];
  children: ReactNode;
}) {
  return (
    <CatalogContext.Provider value={products}>
      {children}
    </CatalogContext.Provider>
  );
}

/** The full live catalog as seen by the current render. */
export function useCatalog(): Product[] {
  return useContext(CatalogContext);
}

/** Resolve a single product by id (slug) from the live catalog. */
export function useCatalogProduct(id?: string): Product | undefined {
  const products = useContext(CatalogContext);
  if (!id) return undefined;
  return products.find((p) => p.id === id);
}
