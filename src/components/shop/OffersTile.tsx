"use client";

import { useCartStore, useCartHydrated } from "@/lib/store/useCartStore";
import { bagMix, liveOffers, nextOfferNudge } from "@/lib/commerce/offers";

/**
 * The running offers as one full-width row inside the product grid. With a bag
 * it names the piece that unlocks the next offer; without one it lists them.
 */
export default function OffersTile() {
  const hydrated = useCartHydrated();
  const cartItems = useCartStore((s) => s.cartItems);
  const openCart = useCartStore((s) => s.openCart);
  const offers = liveOffers();

  const hasBag = hydrated && cartItems.length > 0;
  const nudge = hasBag
    ? nextOfferNudge(
        bagMix(cartItems.map((ci) => ({ name: ci.product.name, price: ci.product.price, quantity: ci.quantity }))),
      )
    : null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-midnight-navy px-4 py-4 text-ivory sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.25em] text-champagne-gold/80">
          Offers running now · applied in your bag
        </p>
        {nudge ? (
          <p className="mt-1 text-base font-semibold leading-snug text-champagne-gold sm:text-lg">{nudge.message}</p>
        ) : (
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-champagne-gold sm:text-base">
            {offers.map((o) => (
              <li key={o.key}>
                ✦ {o.title}
                {o.code && <span className="font-normal text-ivory/70"> · {o.code}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {hasBag && (
        <button
          type="button"
          onClick={openCart}
          className="shrink-0 cursor-pointer self-start rounded-full border border-champagne-gold px-4 py-2 text-[0.7rem] font-bold uppercase tracking-wider text-champagne-gold sm:self-auto"
        >
          View bag
        </button>
      )}
    </div>
  );
}
