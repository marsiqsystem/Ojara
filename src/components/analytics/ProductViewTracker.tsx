"use client";

import { useEffect } from "react";
import type { Product } from "@/lib/mockData";
import { trackEvent } from "@/lib/analytics/capi";

/**
 * Fires the Meta standard `ViewContent` event once when a product page mounts.
 * Rendered from the (server-component) product page — it renders nothing.
 *
 * Keyed on product.id so navigating between products (which can reuse the same
 * page instance) re-fires for the new item.
 */
export default function ProductViewTracker({ product }: { product: Product }) {
  useEffect(() => {
    trackEvent("ViewContent", {
      customData: {
        currency: "INR",
        value: product.price,
        content_ids: [product.id],
        content_name: product.name,
        content_type: "product",
      },
    });
  }, [product.id, product.price, product.name]);

  return null;
}
