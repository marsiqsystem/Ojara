"use client";

import { formatPrice } from "@/lib/format";
import {
  bagMix,
  offerNudges,
  WELCOME_CODE,
  WELCOME_PERCENT,
  type OfferLine,
  type OfferNudge,
} from "@/lib/commerce/offers";
import type { OfferDiscount } from "@/lib/commerce/useWixOffers";

/**
 * The bag's offers at a glance — shared by the bag drawer and checkout: what's
 * already applied (with Wix's own ₹ figures), then every offer the bag is one
 * or two pieces from, with a jump to the row of pieces that gets it there.
 * Nothing here asks for a code; everything applies itself.
 */
export default function OfferProgress({
  lines,
  offers,
  welcomeDiscount,
  onNudge,
  hide = [],
  className = "",
}: {
  lines: OfferLine[];
  /** Automatic offers Wix applies to this bag (useWixOffers). */
  offers: OfferDiscount[];
  /** ₹ WELCOME10 takes off, 0 when it isn't on the bag. */
  welcomeDiscount: number;
  /** Scrolls to that offer's row of pieces; without it the nudges are plain text. */
  onNudge?: (nudge: OfferNudge) => void;
  /** Offers whose nudge is shown elsewhere (checkout's rows carry their own heading). */
  hide?: OfferNudge["offer"][];
  className?: string;
}) {
  const mix = bagMix(lines);
  const nudges = offerNudges(mix).filter((n) => !hide.includes(n.offer));
  const applied = [
    ...offers.map((o) => ({ label: o.name, amount: o.amount })),
    ...(welcomeDiscount > 0
      ? [{ label: `${WELCOME_PERCENT}% off first order (${WELCOME_CODE})`, amount: welcomeDiscount }]
      : []),
  ];
  if (applied.length === 0 && nudges.length === 0) return null;

  return (
    <div className={`rounded-xl border border-champagne-gold/40 bg-champagne-gold/5 px-3 py-2.5 ${className}`}>
      {applied.length > 0 && (
        <ul className="space-y-1 text-xs leading-5">
          {applied.map((a) => (
            <li key={a.label} className="flex justify-between gap-2 font-semibold text-emerald-700">
              <span className="min-w-0">✓ {a.label}</span>
              <span className="shrink-0 tabular-nums">−{formatPrice(a.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      {nudges.length > 0 && (
        <ul className={`space-y-2 ${applied.length > 0 ? "mt-2 border-t border-champagne-gold/30 pt-2" : ""}`}>
          {nudges.map((n) => (
            <li key={n.offer} className="flex items-center gap-2.5">
              {n.offer === "b2g1" ? (
                // Buy 2 get 1 progress: the bracelets towards the next free one.
                <span className="flex shrink-0 gap-1" aria-label={`${3 - n.count} of 3 bracelets`}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`h-2.5 w-2.5 rounded-full ${
                        i < 3 - n.count ? "bg-emerald-600" : "border border-midnight-navy/40 bg-white"
                      }`}
                    />
                  ))}
                </span>
              ) : (
                <span className="shrink-0 text-champagne-gold" aria-hidden="true">✦</span>
              )}
              <span className="min-w-0 flex-1 text-xs font-semibold leading-snug text-midnight-navy">
                {n.message}
              </span>
              {onNudge && (
                <button
                  type="button"
                  onClick={() => onNudge(n)}
                  className="shrink-0 cursor-pointer rounded-full bg-midnight-navy px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-champagne-gold"
                >
                  {n.add === "ring" ? "See rings" : "See bracelets"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
