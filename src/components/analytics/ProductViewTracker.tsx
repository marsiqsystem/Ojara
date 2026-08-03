"use client";

import { useEffect, useRef } from "react";
import type { Product } from "@/lib/mockData";
import { trackEvent } from "@/lib/analytics/capi";
import { contentId, toContents } from "@/lib/analytics/content";

/**
 * Fires the Meta standard `ViewContent` event once when a product page mounts.
 * Rendered from the (server-component) product page — it renders nothing.
 *
 * Keyed on product.id so navigating between products (which can reuse the same
 * page instance) re-fires for the new item.
 */
export default function ProductViewTracker({ product }: { product: Product }) {
  // Deliberately primitive deps: the `product` object is a fresh reference on
  // every server render, so depending on it directly would re-fire ViewContent
  // on incidental re-renders.
  const { id, price, name, wixCatalogItemId } = product;
  // One ViewContent per product, even when the effect is re-invoked (React
  // StrictMode double-mounts in development, which otherwise sends two events
  // under two different event ids — so CAPI can't de-duplicate them either).
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (lastTracked.current === id) return;
    lastTracked.current = id;

    const item = { id, price, name, wixCatalogItemId };
    trackEvent("ViewContent", {
      customData: {
        currency: "INR",
        value: price,
        // The Wix catalog id, not our slug — that's what Meta's product feed is
        // keyed on (see lib/analytics/content.ts).
        content_ids: [contentId(item)],
        contents: toContents([item]),
        content_name: name,
        content_type: "product",
      },
    });
  }, [id, price, name, wixCatalogItemId]);

  return null;
}
