"use client";

import { toast } from "sonner";
import type { Product } from "@/lib/mockData";
import { useCartStore } from "@/lib/store/useCartStore";
import { trackEvent } from "@/lib/analytics/capi";
import { contentId, toContents, toGa4Items } from "@/lib/analytics/content";

export default function AddToCartButton({
  product,
  className,
  children = "Add to Bag",
  onAdded,
  ariaLabel,
  quantity = 1,
}: {
  product: Product;
  className?: string;
  children?: React.ReactNode;
  // Optional hook fired after the item is added (e.g. to close a modal).
  onAdded?: () => void;
  // Units this click adds, for the AddToCart value. The store still bumps by one;
  // a caller with a quantity selector reconciles the line in `onAdded`.
  quantity?: number;
  // Required when `children` is icon-only (the product grid): without it the
  // button has no accessible name and reads as an empty control.
  ariaLabel?: string;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);
  const isOutOfStock = product.stockCount === 0;

  const handleClick = () => {
    addItem(product);
    trackEvent("AddToCart", {
      customData: {
        currency: "INR",
        value: product.price * quantity,
        content_ids: [contentId(product)],
        contents: toContents([{ ...product, quantity }]),
        num_items: quantity,
        content_name: product.name,
        content_type: "product",
      },
      items: toGa4Items([{ ...product, quantity }]),
    });
    toast.success("✦ Added to Cart successfully!", {
      description: product.name,
      style: {
        background: "#10b981",
        color: "#ffffff",
        border: "none",
      },
    });
    onAdded?.();
    openCart(); // slide the drawer open to confirm the addition
  };

  return (
    <button
      type="button"
      disabled={isOutOfStock}
      onClick={handleClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={
        isOutOfStock
          ? "w-full sm:w-auto rounded-full bg-gray-200 text-gray-400 border border-gray-300 px-3 py-1.5 sm:px-5 sm:py-2 text-[0.65rem] sm:text-xs font-semibold uppercase tracking-[0.15em] sm:tracking-[0.2em] cursor-not-allowed text-center"
          : `cursor-pointer transition-all duration-150 active:scale-95 ${className}`
      }
    >
      {isOutOfStock ? "Sold Out" : children}
    </button>
  );
}
