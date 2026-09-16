"use client";

import { useCartStore, useCartHydrated, selectTotalPrice } from "@/lib/store/useCartStore";
import { formatPrice } from "@/lib/format";
import { tierPercent } from "@/lib/commerce/pricing";
import { useAvailableTiers } from "@/lib/commerce/useAutoTierCoupon";

/**
 * "Spend more, save more" on the home page — every automatic reward, and, when
 * the shopper already has a bag, exactly how far they are from the next one.
 * Steps Wix has refused are left out (useAvailableTiers).
 */
export default function OfferLadderBanner() {
  const tiers = useAvailableTiers();
  const hydrated = useCartHydrated();
  const bagTotal = useCartStore(selectTotalPrice);
  const openCart = useCartStore((s) => s.openCart);
  const subtotal = hydrated ? bagTotal : 0;

  if (tiers.length === 0) return null;
  const next = tiers.find((t) => subtotal < t.minimum);

  return (
    <section aria-labelledby="offer-ladder" className="bg-midnight-navy px-6 py-12 text-ivory sm:py-16">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-champagne-gold">No code needed</p>
        <h2 id="offer-ladder" className="mt-2 font-heading text-3xl text-champagne-gold sm:text-4xl">
          Spend more, save more
        </h2>
        <p className="mt-2 text-sm text-ivory/75">
          Every reward is applied automatically in your bag — free delivery and Cash on Delivery on
          every order.
        </p>

        <ol className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-5">
          {tiers.map((t) => {
            const reached = subtotal >= t.minimum;
            return (
              <li
                key={t.code}
                className={`rounded-2xl border p-4 sm:p-5 ${
                  reached ? "border-champagne-gold bg-champagne-gold/15" : "border-ivory/20 bg-ivory/5"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.2em] text-ivory/65">
                  Bag of {formatPrice(t.minimum)}+
                </p>
                <p className="mt-1 font-heading text-2xl text-champagne-gold sm:text-3xl">
                  {tierPercent(t)}% OFF{t.perk ? ` + ${t.perk}` : ""}
                </p>
                {reached && <p className="mt-1 text-xs font-semibold text-emerald-300">✓ Unlocked in your bag</p>}
              </li>
            );
          })}
        </ol>

        {subtotal > 0 && next && (
          <button
            type="button"
            onClick={openCart}
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-champagne-gold px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-midnight-navy"
          >
            Add {formatPrice(Math.ceil(next.minimum - subtotal))} more for {tierPercent(next)}% OFF · View bag
          </button>
        )}
      </div>
    </section>
  );
}
