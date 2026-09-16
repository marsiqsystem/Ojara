"use client";

import { formatPrice } from "@/lib/format";
import { tierPercent } from "@/lib/commerce/pricing";
import { useAvailableTiers } from "@/lib/commerce/useAutoTierCoupon";

/**
 * Spend-ladder progress: how far the bag is from the next reward, with a marker
 * per step. Shared by the bag drawer and checkout. The code applies itself
 * (useAutoTierCoupon), so this only explains — it never asks for a code. Steps
 * Wix has refused are left out, so it never claims a discount the bag can't get.
 */
export default function TierProgress({
  subtotal,
  className = "",
}: {
  /** Products subtotal (₹) — the figure the coupon minimums are checked against. */
  subtotal: number;
  className?: string;
}) {
  const tiers = useAvailableTiers();
  if (tiers.length === 0) return null;

  const top = tiers[tiers.length - 1];
  const next = tiers.find((t) => subtotal < t.minimum);
  const reached = [...tiers].reverse().find((t) => subtotal >= t.minimum);
  const progress = Math.min(100, Math.round((subtotal / top.minimum) * 100));

  return (
    <div className={className}>
      <p className="text-center text-xs leading-5 text-midnight-navy/85 sm:text-sm">
        {next ? (
          <>
            {reached && (
              <span className="font-semibold text-emerald-700">
                ✓ {tierPercent(reached)}% OFF applied ·{" "}
              </span>
            )}
            Add <b className="text-midnight-navy">{formatPrice(Math.ceil(next.minimum - subtotal))}</b> more for{" "}
            <b className="text-midnight-navy">
              {tierPercent(next)}% OFF{next.perk ? ` + ${next.perk}` : ""}
            </b>
          </>
        ) : (
          <span className="font-semibold text-emerald-700">
            🎉 Unlocked: {tierPercent(top)}% OFF{top.perk ? ` + ${top.perk}` : ""} — applied automatically
          </span>
        )}
      </p>

      <div
        className="relative mt-2 h-1.5 rounded-full bg-champagne-gold/20"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Progress to the next offer"
      >
        <div
          className="h-full rounded-full bg-champagne-gold transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
        {tiers.slice(0, -1).map((t) => (
          <span
            key={t.code}
            aria-hidden="true"
            className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-champagne-gold"
            style={{ left: `${(t.minimum / top.minimum) * 100}%` }}
          />
        ))}
      </div>

      <div className="mt-1.5 flex justify-between gap-2 text-[0.65rem] text-midnight-navy/55">
        {tiers.map((t) => (
          <span
            key={t.code}
            className={subtotal >= t.minimum ? "font-semibold text-champagne-gold" : ""}
          >
            {formatPrice(t.minimum)}+: {tierPercent(t)}% OFF{t.perk ? " + free wrap" : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
