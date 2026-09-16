"use client";

import { formatPrice } from "@/lib/format";
import { tierPercent } from "@/lib/commerce/pricing";
import { useAvailableTiers } from "@/lib/commerce/useAutoTierCoupon";
import type { Product } from "@/lib/mockData";

const OPTIONS = [
  { count: 1, name: "Single" },
  { count: 2, name: "Pair" },
  { count: 3, name: "Trio" },
] as const;

/**
 * "Buy more, save more" as ready-made choices — Single / Pair / Trio — the
 * quantity-bundle cards from the reference PDP. Every figure is the real spend
 * ladder applied to this piece's price (the bag applies the same step
 * automatically), so a card only shows a saving the order truly earns. No
 * "only today" label: the offer is the same tomorrow.
 *
 * Tapping a card sets the quantity for Add to Cart / Buy Now.
 */
export default function BundleOptions({
  product,
  qty,
  maxQty,
  onSelect,
}: {
  product: Product;
  qty: number;
  maxQty: number;
  onSelect: (count: number) => void;
}) {
  const tiers = useAvailableTiers();

  const options = OPTIONS.filter((o) => o.count <= maxQty).map((o) => {
    const subtotal = product.price * o.count;
    const tier = [...tiers].reverse().find((t) => subtotal >= t.minimum);
    const total = tier ? Math.round(subtotal * (1 - tier.value)) : subtotal;
    // Strike the undiscounted figure: MRP for a single piece, the pre-offer total otherwise.
    const was = tier ? subtotal : product.originalPrice && product.originalPrice > product.price ? product.originalPrice : undefined;
    return { ...o, subtotal, tier, total, was };
  });

  // Nothing to sell if no multi-piece option earns a saving.
  if (!options.some((o) => o.tier)) return null;
  const best = options.reduce((a, b) => ((b.tier?.value ?? 0) > (a.tier?.value ?? 0) ? b : a));

  return (
    <section aria-labelledby="bundle-title" className="mt-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="bundle-title" className="text-xs font-semibold uppercase tracking-[0.25em] text-midnight-navy">
          Buy more, save more
        </h2>
        <span className="text-[0.65rem] text-midnight-navy/55">Applied in your bag</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-label="How many pieces">
        {options.map((o) => {
          const selected = qty === o.count;
          return (
            <button
              key={o.count}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(o.count)}
              className={`relative flex cursor-pointer flex-col items-center rounded-xl border-2 px-2 pb-3 pt-4 text-center transition-all ${
                selected
                  ? "border-champagne-gold bg-champagne-gold/10"
                  : "border-midnight-navy/15 bg-white hover:border-champagne-gold/60"
              }`}
            >
              {o === best && o.tier && (
                <span className="absolute -top-2.5 rounded-full bg-midnight-navy px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-champagne-gold">
                  Best value
                </span>
              )}
              <span className="text-sm font-semibold text-midnight-navy">{o.name}</span>
              <span className="mt-0.5 text-[0.66rem] leading-tight text-midnight-navy/60">
                {o.tier
                  ? `Save ${tierPercent(o.tier)}%${o.tier.perk ? " + free wrap" : ""}`
                  : o.count === 1
                    ? "Standard price"
                    : "Add one more to save"}
              </span>
              <span className="mt-2 text-base font-bold tabular-nums text-midnight-navy">{formatPrice(o.total)}</span>
              {o.was && <span className="text-[0.66rem] tabular-nums text-midnight-navy/40 line-through">{formatPrice(o.was)}</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[0.7rem] text-midnight-navy/55">
        Mix any pieces — the saving applies to your whole bag automatically.
      </p>
    </section>
  );
}
