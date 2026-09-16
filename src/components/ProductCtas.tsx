"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/lib/mockData";
import AddToCartButton from "@/components/AddToCartButton";
import BuyNowConfirmModal, {
  type AbandonedCartItem,
} from "@/components/BuyNowConfirmModal";
import { useCartStore } from "@/lib/store/useCartStore";
import { trackEvent } from "@/lib/analytics/capi";
import { contentId, toContents, toGa4Items } from "@/lib/analytics/content";
import { LOW_STOCK_THRESHOLD } from "@/lib/commerce/config";

export default function ProductCtas({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const openCheckout = useCartStore((state) => state.openCheckout);
  const cartItems = useCartStore((state) => state.cartItems);
  const isOutOfStock = product.stockCount === 0;

  const [qty, setQty] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [abandonedItems, setAbandonedItems] = useState<AbandonedCartItem[]>([]);
  // Cap the selector at what's on hand, never below 1. Stock is managed in Wix;
  // when Wix marks an item out of stock, stockCount arrives as 0 and the
  // out-of-stock branch below takes over.
  const maxQty = Math.max(1, product.stockCount || 1);

  // The cart lines that are a DIFFERENT product than the one being bought now.
  // These are the "abandoned" items the shopper must decide about.
  const collectAbandonedItems = (): AbandonedCartItem[] =>
    cartItems
      .filter((item) => item.product.id !== product.id)
      .map((item) => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        image: item.product.image,
      }));

  // The actual buy-now: add the current item (if new), set its quantity, and
  // open checkout. Unchanged behaviour — the modal only gates *when* this runs.
  const runBuyNow = () => {
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
        items: toGa4Items([{ ...product, quantity: qty }]),
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

  const handleBuyNow = () => {
    // If other products are sitting in the cart, ask before dragging them into
    // this order (they'd otherwise be charged too). Otherwise buy straight away.
    const others = collectAbandonedItems();
    if (others.length > 0) {
      setAbandonedItems(others);
      setConfirmOpen(true);
      return;
    }
    runBuyNow();
  };

  const handleConfirmDecision = (decision: "yes" | "no") => {
    // "no" → drop the other products from the cart so only this item is charged.
    // "yes" → keep them; runBuyNow just adds the current item alongside.
    if (decision === "no") {
      abandonedItems.forEach((item) => removeItem(item.id));
    }
    runBuyNow();
    setConfirmOpen(false);
  };

  // AddToCartButton has already called addItem() (+1) by the time this fires, so
  // reconcile the line to what was in the bag BEFORE the click plus the selector.
  // Setting it to `qty` alone used to shrink an existing line: 2 in the bag, add 1
  // more, and the bag dropped to 1.
  const inBagBefore =
    cartItems.find((item) => item.product.id === product.id)?.quantity ?? 0;
  const handleAddToCart = () => {
    // Never past what Wix has on hand.
    updateQuantity(product.id, Math.min(inBagBefore + qty, maxQty));
  };

  if (isOutOfStock) {
    return (
      <div className="mt-6">
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-full bg-gray-200 text-gray-500 border border-gray-300 px-6 py-4 text-xs font-bold uppercase tracking-wider text-center"
        >
          {/* Was "SOLD OUT - JOIN WAITLIST" — there is no waitlist to join. */}
          Sold out
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
        {/* Honest urgency: Wix tracks real stock, so a low count is shown as it is. */}
        {product.stockCount <= LOW_STOCK_THRESHOLD ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            Only {product.stockCount} left
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            In Stock
          </span>
        )}
      </div>

      {/* Button styles swapped (owner call 2026-07-17): Add to Cart is the golden
          filled button, Buy Now is the outlined one that fills navy-blue on hover. */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        <AddToCartButton
          product={product}
          onAdded={handleAddToCart}
          quantity={qty}
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

      <BuyNowConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        abandonedItems={abandonedItems}
        currentProductPrice={product.price * qty}
        onDecision={handleConfirmDecision}
      />
    </div>
  );
}
