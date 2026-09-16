"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/mockData";
import { useCartStore, useCartHydrated } from "@/lib/store/useCartStore";
import { formatPrice } from "@/lib/format";
import AddToCartButton from "@/components/AddToCartButton";

/**
 * "Complete your ritual" — a short cross-sell row directly under the buy buttons
 * (the Viora "Complete the look" pattern). One tap adds the piece and opens the
 * bag, where the shopper sees the new total and the offer it unlocked. Pieces
 * already in the bag say so instead of offering a second add.
 */
export default function PairItWith({ items }: { items: Product[] }) {
  const hydrated = useCartHydrated();
  const cartItems = useCartStore((s) => s.cartItems);
  const openCart = useCartStore((s) => s.openCart);

  if (items.length === 0) return null;
  const inBag = new Set(hydrated ? cartItems.map((ci) => ci.product.id) : []);

  return (
    <section aria-labelledby="pair-it-with-title" className="mt-8">
      <h2
        id="pair-it-with-title"
        className="text-xs font-semibold uppercase tracking-[0.25em] text-midnight-navy"
      >
        Complete your ritual
      </h2>
      <p className="mt-1 text-xs text-midnight-navy/60">
        Pieces worn with this one — and a step closer to your next offer.
      </p>

      <div className="-mx-6 mt-3 flex snap-x scroll-px-6 gap-3 overflow-x-auto px-6 pb-1 hide-scrollbar lg:mx-0 lg:scroll-px-0 lg:px-0">
        {items.map((item) => {
          const discount =
            item.originalPrice && item.originalPrice > item.price
              ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
              : 0;
          return (
            <div
              key={item.id}
              className="w-36 shrink-0 snap-start overflow-hidden rounded-xl border border-champagne-gold/25 bg-white"
            >
              <Link href={`/product/${item.id}`} className="relative block aspect-square bg-sand">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="144px"
                  className="object-cover"
                />
                {discount > 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-midnight-navy px-2 py-0.5 text-[0.6rem] font-bold text-champagne-gold">
                    {discount}% OFF
                  </span>
                )}
              </Link>
              <div className="p-2.5">
                <Link
                  href={`/product/${item.id}`}
                  className="line-clamp-1 text-xs font-medium text-midnight-navy hover:text-champagne-gold"
                >
                  {item.name}
                </Link>
                <p className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-midnight-navy">{formatPrice(item.price)}</span>
                  {discount > 0 && (
                    <span className="text-[0.65rem] text-midnight-navy/40 line-through">
                      {formatPrice(item.originalPrice!)}
                    </span>
                  )}
                </p>
                {inBag.has(item.id) ? (
                  <button
                    type="button"
                    onClick={openCart}
                    className="mt-2 flex h-9 w-full cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-[0.65rem] font-semibold uppercase tracking-wide text-white"
                  >
                    ✓ In your bag
                  </button>
                ) : (
                  <AddToCartButton
                    product={item}
                    ariaLabel={`Add ${item.name} to bag`}
                    className="mt-2 flex h-9 w-full items-center justify-center rounded-full border border-midnight-navy text-[0.65rem] font-semibold uppercase tracking-wide text-midnight-navy hover:bg-midnight-navy hover:text-champagne-gold"
                  >
                    + Add
                  </AddToCartButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
