"use client";

import { useCartStore, useCartHydrated } from "@/lib/store/useCartStore";
import { formatPrice } from "@/lib/format";
import { PREPAID_ENABLED } from "@/lib/commerce/config";
import { PREPAID_DISCOUNT, tierPercent, type CouponTier } from "@/lib/commerce/pricing";
import { useAvailableTiers } from "@/lib/commerce/useAutoTierCoupon";

const CheckIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

/**
 * "Offers for you" on the product page — the Viora pattern. It works the spend
 * ladder out from THIS piece's price plus whatever is already in the bag, so the
 * shopper reads exactly what one more piece earns them ("Add 1 more piece for
 * 10% OFF"). The bag applies the best step itself (useAutoTierCoupon), so no code
 * is shown or needed. The pay-online card only appears once prepaid is live.
 */
export default function ProductOffers({
  price,
  productId,
}: {
  price: number;
  productId: string;
}) {
  const hydrated = useCartHydrated();
  const cartItems = useCartStore((s) => s.cartItems);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  // Only steps Wix hasn’t refused — never advertise a discount the bag can’t apply.
  const tiers = useAvailableTiers();

  // Bag total without this piece; the piece being viewed counts once.
  const otherItemsTotal = hydrated
    ? cartItems
        .filter((ci) => ci.product.id !== productId)
        .reduce((sum, ci) => sum + ci.product.price * ci.quantity, 0)
    : 0;
  const orderWithThis = otherItemsTotal + price;

  const top = tiers[tiers.length - 1];
  const next = tiers.find((t) => orderWithThis < t.minimum);
  const unlocked = tiers.filter((t) => orderWithThis >= t.minimum);
  const best = unlocked[unlocked.length - 1];
  const progress = top ? Math.min(100, Math.round((orderWithThis / top.minimum) * 100)) : 0;

  const what = (t: CouponTier) => `${tierPercent(t)}% OFF${t.perk ? ` + ${t.perk}` : ""}`;

  // Pieces of about this price still needed for each locked step.
  const hints = tiers.filter((t) => orderWithThis < t.minimum).map((t, i) => {
    const pieces = price > 0 ? Math.ceil((t.minimum - orderWithThis) / price) : 0;
    return i === 0
      ? `Add ${pieces} more piece${pieces === 1 ? "" : "s"} for ${what(t)}`
      : `${pieces} more for ${what(t)}`;
  });

  const tierStatus = (t: CouponTier) => {
    if (hydrated && appliedCoupon === t.code) return "✓ Applied in your bag";
    if (orderWithThis >= t.minimum) return "✓ Unlocks with this piece";
    return "Applies automatically";
  };

  const offerCount = (PREPAID_ENABLED ? 1 : 0) + (top ? 1 : 0);
  if (offerCount === 0) return null;

  return (
    <section aria-labelledby="offers-title" className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <h2
          id="offers-title"
          className="text-xs font-semibold uppercase tracking-[0.25em] text-midnight-navy"
        >
          Offers for you
        </h2>
        <span className="rounded-full bg-champagne-gold px-2 py-0.5 text-[0.65rem] font-bold text-midnight-navy">
          {offerCount}
        </span>
      </div>

      <div className="space-y-3">
        {/* Pay online — only once Razorpay is live (PREPAID_ENABLED). */}
        {PREPAID_ENABLED && (
          <div className="overflow-hidden rounded-xl border-2 border-emerald-600">
            <div className="flex items-center justify-between gap-2 bg-emerald-600 px-3 py-1.5 text-white">
              <span className="text-[0.7rem] font-bold uppercase tracking-wider">
                Best price · Pay online
              </span>
              <span className="rounded bg-white px-1.5 py-0.5 text-[0.7rem] font-extrabold text-emerald-700">
                SAVE {formatPrice(PREPAID_DISCOUNT)}
              </span>
            </div>
            <div className="bg-emerald-50 px-3 py-3">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-2xl font-bold text-emerald-800">
                  {formatPrice(Math.max(0, price - PREPAID_DISCOUNT))}
                </span>
                <span className="text-sm text-midnight-navy/40 line-through">
                  {formatPrice(price)}
                </span>
                <span className="text-xs font-medium text-emerald-700">with UPI / card</span>
              </p>
              <p className="mt-1.5 text-xs text-emerald-900/80">
                Extra {formatPrice(PREPAID_DISCOUNT)} off at checkout · Cash on Delivery still
                available
              </p>
            </div>
          </div>
        )}

        {/* Spend ladder */}
        {top && (
          <div className="rounded-xl border-2 border-dashed border-champagne-gold/60 bg-champagne-gold/5 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[0.7rem] font-bold uppercase tracking-wider text-champagne-gold">
                Spend more, save more
              </p>
              <p className="text-[0.65rem] text-midnight-navy/55">No code needed</p>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              {tiers.map((t) => {
                const isUnlocked = orderWithThis >= t.minimum;
                const applied = hydrated && appliedCoupon === t.code;
                return (
                  <div
                    key={t.code}
                    className={`rounded-lg bg-white p-2.5 ${
                      isUnlocked ? "border-2 border-champagne-gold" : "border border-champagne-gold/30"
                    }`}
                  >
                    <span className="block text-sm font-bold leading-tight text-midnight-navy">
                      {tierPercent(t)}% OFF{t.perk ? " + FREE wrap" : ""}
                    </span>
                    <span className="block text-[0.7rem] text-midnight-navy/55">
                      on {formatPrice(t.minimum)}+
                    </span>
                    <span
                      className={`mt-1.5 flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wide ${
                        applied || isUnlocked ? "text-emerald-700" : "text-midnight-navy/55"
                      }`}
                    >
                      {tierStatus(t)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="relative mt-3 h-1.5 rounded-full bg-champagne-gold/20" aria-hidden="true">
              <div
                className="h-full rounded-full bg-champagne-gold transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
              {tiers.slice(0, -1).map((t) => (
                <span
                  key={t.code}
                  className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-champagne-gold"
                  style={{ left: `${(t.minimum / top.minimum) * 100}%` }}
                />
              ))}
            </div>

            <p className="mt-2 flex items-start gap-1.5 text-xs leading-snug text-midnight-navy/80">
              {next ? (
                <>
                  {best && (
                    <b className="text-emerald-700">{tierPercent(best)}% OFF unlocked. </b>
                  )}
                  {hints.join(" · ")}.
                </>
              ) : (
                <>
                  <CheckIcon className="mt-px h-3.5 w-3.5 flex-shrink-0 text-emerald-700" />
                  <span>
                    This order gets <b>{what(top)}</b>, applied in your bag.
                  </span>
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
