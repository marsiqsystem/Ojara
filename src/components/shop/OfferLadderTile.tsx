"use client";

import { useCartStore, useCartHydrated, selectTotalPrice } from "@/lib/store/useCartStore";
import { formatPrice } from "@/lib/format";
import { tierPercent } from "@/lib/commerce/pricing";
import { useAvailableTiers } from "@/lib/commerce/useAutoTierCoupon";

/**
 * The spend ladder as one full-width row inside the product grid. With a bag it
 * shows the exact gap to the next reward and a progress bar; without one it
 * states every step. Steps Wix has refused are left out.
 */
export default function OfferLadderTile() {
  const tiers = useAvailableTiers();
  const hydrated = useCartHydrated();
  const bagTotal = useCartStore(selectTotalPrice);
  const openCart = useCartStore((s) => s.openCart);
  const subtotal = hydrated ? bagTotal : 0;
  if (tiers.length === 0) return null;

  const top = tiers[tiers.length - 1];
  const next = tiers.find((t) => subtotal < t.minimum);
  const target = next?.minimum ?? top.minimum;
  const progress = Math.min(100, Math.round((subtotal / target) * 100));
  const what = (t: (typeof tiers)[number]) => `${tierPercent(t)}% OFF${t.perk ? ` + ${t.perk}` : ""}`;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-midnight-navy px-4 py-4 text-ivory sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.25em] text-champagne-gold/80">
          Spend more, save more · no code needed
        </p>
        <p className="mt-1 text-base font-semibold leading-snug text-champagne-gold sm:text-lg">
          {subtotal > 0 && next
            ? `Add ${formatPrice(Math.ceil(next.minimum - subtotal))} more for ${what(next)}`
            : subtotal > 0
              ? `You've unlocked ${what(top)}`
              : tiers.map((t) => `${what(t)} on ${formatPrice(t.minimum)}+`).join(" · ")}
        </p>
        {subtotal > 0 && next && (
          <div className="mt-2 h-1.5 w-full max-w-sm rounded-full bg-ivory/20" aria-hidden="true">
            <div className="h-full rounded-full bg-champagne-gold" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      {subtotal > 0 && (
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
