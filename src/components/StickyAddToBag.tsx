"use client";

import Image from "next/image";
import { toast } from "sonner";
import type { Product } from "@/lib/mockData";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/lib/store/useCartStore";
import { trackEvent } from "@/lib/analytics/capi";
import { contentId, toContents, toGa4Items } from "@/lib/analytics/content";

/**
 * Mobile-only checkout bar, modelled on Viora's pinned product bar: a dark
 * rounded card carrying the product thumbnail, name, price and a bright BUY NOW
 * button. Shown from the moment the product page opens and pinned there the
 * whole time (owner call 2026-07-17) so the primary action is always in reach.
 */
export default function StickyAddToBag({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);
  const openCheckout = useCartStore((state) => state.openCheckout);
  const cartItems = useCartStore((state) => state.cartItems);
  const isOutOfStock = product.stockCount === 0;

  const handleBuyNow = () => {
    const alreadyInCart = cartItems.some((item) => item.product.id === product.id);
    if (!alreadyInCart) {
      addItem(product);
      // Buy Now still puts the item in the cart, so it's a genuine AddToCart —
      // fire it (only when the item actually enters the cart) so the Meta funnel
      // counts these, not just clicks on the standalone "Add to Cart" button.
      trackEvent("AddToCart", {
        customData: {
          currency: "INR",
          value: product.price,
          content_ids: [contentId(product)],
          contents: toContents([product]),
          num_items: 1,
          content_name: product.name,
          content_type: "product",
        },
        items: toGa4Items([product]),
      });
    }
    // NOTE: InitiateCheckout is NOT fired here — CheckoutModal owns it (one IC
    // per checkout opened, whichever button opened it).
    toast.success("✦ Item secured! Proceeding to checkout...", {
      description: product.name,
      style: { background: "#10b981", color: "#ffffff", border: "none" },
    });
    openCheckout();
  };

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-40 px-3 md:hidden"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-midnight-navy px-3 py-2.5 shadow-2xl ring-1 ring-champagne-gold/30">
        {/* Thumbnail */}
        <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-sand">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="44px"
            className="object-cover"
          />
        </div>

        {/* Name + price */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ivory">{product.name}</p>
          <p className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-champagne-gold">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-ivory/40 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={isOutOfStock}
          className="flex-shrink-0 cursor-pointer rounded-xl bg-champagne-gold px-5 py-3 text-xs font-bold uppercase tracking-[0.15em] text-midnight-navy shadow-lg transition-all duration-150 hover:bg-champagne-gold/85 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-500 disabled:text-gray-300"
        >
          {isOutOfStock ? "Sold Out" : "Buy Now"}
        </button>
      </div>
    </div>
  );
}
