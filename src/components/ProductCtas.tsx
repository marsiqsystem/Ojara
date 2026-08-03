"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/lib/mockData";
import AddToCartButton from "@/components/AddToCartButton";
import { useCartStore } from "@/lib/store/useCartStore";
import { trackEvent } from "@/lib/analytics/capi";
import { contentId, toContents } from "@/lib/analytics/content";

export default function ProductCtas({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const openCart = useCartStore((state) => state.openCart);
  const openCheckout = useCartStore((state) => state.openCheckout);
  const cartItems = useCartStore((state) => state.cartItems);
  const isOutOfStock = product.stockCount === 0;

  const [qty, setQty] = useState(1);
  // Cap the selector at what's on hand, never below 1. Stock is managed in Wix;
  // when Wix marks an item out of stock, stockCount arrives as 0 and the
  // out-of-stock branch below takes over.
  const maxQty = Math.max(1, product.stockCount || 1);

  const handleBuyNow = () => {
    // Check if there are other items in the cart
    const hasOtherItems = cartItems.some((item) => item.product.id !== product.id);

    if (hasOtherItems) {
      const proceed = window.confirm(
        "✦ You already have items in your cart from a previous session.\n\nClick 'OK' to combine them and proceed to checkout, or 'Cancel' to review your cart."
      );
      if (!proceed) {
        openCart(); // Show the cart drawer
        return;
      }
    }

    // Add the current item to the cart if not already present, then set the
    // chosen quantity (addItem only ever bumps by one).
    const alreadyInCart = cartItems.some((item) => item.product.id === product.id);
    if (!alreadyInCart) {
      addItem(product);
      // Buy Now still puts the item in the cart, so it's a genuine AddToCart —
      // fire it (only when the item actually enters the cart) so the Meta funnel
      // counts these, not just clicks on the standalone "Add to Cart" button.
      trackEvent("AddToCart", {
        customData: {
          currency: "INR",
          value: product.price * qty,
          content_ids: [contentId(product)],
          contents: toContents([{ ...product, quantity: qty }]),
          num_items: qty,
          content_name: product.name,
          content_type: "product",
        },
      });
    }
    updateQuantity(product.id, qty);

    // NOTE: InitiateCheckout is NOT fired here. It has exactly one source —
    // CheckoutModal, when the modal actually opens — so the Meta funnel counts
    // one IC per checkout regardless of which button got the shopper there.

    toast.success("✦ Item secured! Proceeding to checkout...", {
      description: product.name,
      style: {
        background: "#10b981",
        color: "#ffffff",
        border: "none",
      },
    });

    openCheckout(); // Open checkout directly
  };

  // AddToCartButton has already called addItem() by the time this fires; we only
  // need to reconcile the line to the quantity chosen in the selector.
  const handleAddToCart = () => {
    updateQuantity(product.id, qty);
  };

  if (isOutOfStock) {
    return (
      <div className="mt-6">
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-full bg-gray-200 text-gray-500 border border-gray-300 px-6 py-4 text-xs font-bold uppercase tracking-wider text-center"
        >
          SOLD OUT - JOIN WAITLIST
        </button>
      </div>
    );
  }

  return (
    <div id="main-add-to-bag" className="mt-6">
      {/* Quantity selector + stock status, sitting directly above the primary
          actions so the shopper sets intent then acts. Stock is Wix-managed. */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-midnight-navy/60">
          Qty
        </span>
        <div className="inline-flex items-center rounded-full border border-midnight-navy/25">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-midnight-navy transition-colors hover:bg-sand/60 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold text-midnight-navy tabular-nums">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={qty >= maxQty}
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-midnight-navy transition-colors hover:bg-sand/60 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            +
          </button>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          In Stock
        </span>
      </div>

      {/* Button styles swapped (owner call 2026-07-17): Add to Cart is the golden
          filled button, Buy Now is the outlined one that fills navy-blue on hover. */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        <AddToCartButton
          product={product}
          onAdded={handleAddToCart}
          className="w-full rounded-full bg-champagne-gold text-midnight-navy px-6 py-4 text-xs font-bold uppercase tracking-wider hover:bg-champagne-gold/85 transition-all duration-150 md:hover:shadow-xl active:scale-95 shadow-lg"
        >
          Add to Cart
        </AddToCartButton>
        <button
          type="button"
          onClick={handleBuyNow}
          className="w-full cursor-pointer rounded-full border-2 border-midnight-navy bg-transparent text-midnight-navy px-6 py-4 text-xs font-bold uppercase tracking-wider hover:bg-midnight-navy hover:text-ivory transition-colors flex items-center justify-center gap-2"
        >
          Buy Now ⚡
        </button>
      </div>
    </div>
  );
}
