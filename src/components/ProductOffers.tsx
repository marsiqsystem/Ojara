"use client";

import { useState } from "react";
import type { Product } from "@/lib/mockData";
import PairItWith from "@/components/PairItWith";
import { useCartStore, useCartHydrated } from "@/lib/store/useCartStore";
import { formatPrice } from "@/lib/format";
import { PREPAID_ENABLED } from "@/lib/commerce/config";
import { PREPAID_DISCOUNT } from "@/lib/commerce/pricing";
import {
  BUY2GET1_LIVE,
  COMBO_PERCENT,
  WELCOME_CODE,
  WELCOME_PERCENT,
  bagMix,
  pieceKind,
} from "@/lib/commerce/offers";
import { useAvailableTiers } from "@/lib/commerce/useAutoTierCoupon";

/**
 * "Offers for you" on the product page — the Viora pattern, filled with the
 * offers OJARA actually runs (lib/commerce/offers): the first-order code, the
 * bracelet + ring combo (10% off the ring, told from THIS piece's side), buy 2
 * get 1 on bracelets, and ₹49 off prepaid once online payment is
 * on. Each card reads against what's already in the bag. "Browse rings" opens
 * the matching pieces right here, one tap to add — no leaving the page.
 */
export default function ProductOffers({
  price,
  productId,
  productName,
  comboPieces,
}: {
  price: number;
  productId: string;
  productName: string;
  /** Pieces of the other kind (rings for a bracelet page), best matches first. */
  comboPieces: Product[];
}) {
  const [browsing, setBrowsing] = useState(false);
  const hydrated = useCartHydrated();
  const cartItems = useCartStore((s) => s.cartItems);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  // WELCOME10 drops out once Wix has refused it this visit (already used).
  const welcomeAvailable = useAvailableTiers().some((t) => t.code === WELCOME_CODE);

  const kind = pieceKind({ name: productName });
  const other = kind === "ring" ? "bracelet" : "ring";
  // The rest of the bag, not counting this piece.
  const bag = bagMix(
    hydrated
      ? cartItems
          .filter((ci) => ci.product.id !== productId)
          .map((ci) => ({ name: ci.product.name, price: ci.product.price, quantity: ci.quantity }))
      : [],
  );
  const bagHasOther = kind === "ring" ? bag.bracelets > 0 : bag.rings > 0;
  // The 10% comes off the ring: this piece on a ring page, the cheapest ring on
  // offer on a bracelet page.
  const ringPrice =
    kind === "ring"
      ? price
      : comboPieces.reduce((min, p) => Math.min(min, p.price), Number.POSITIVE_INFINITY);
  const comboRingPrice = Number.isFinite(ringPrice) ? Math.round(ringPrice * (1 - COMBO_PERCENT / 100)) : 0;
  const welcomePrice = Math.round(price * (1 - WELCOME_PERCENT / 100));

  const showBuy2 = BUY2GET1_LIVE && kind === "bracelet";
  const offerCount = 2 + (PREPAID_ENABLED ? 1 : 0) + (showBuy2 ? 1 : 0) - (welcomeAvailable ? 0 : 1);

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
        {/* First order — WELCOME10, added in the bag automatically. */}
        {welcomeAvailable && (
          <div className="overflow-hidden rounded-xl border-2 border-emerald-600">
            <div className="flex items-center justify-between gap-2 bg-emerald-600 px-3 py-1.5 text-white">
              <span className="text-[0.7rem] font-bold uppercase tracking-wider">First order</span>
              <span className="rounded bg-white px-1.5 py-0.5 text-[0.7rem] font-extrabold tracking-wider text-emerald-700">
                {WELCOME_CODE}
              </span>
            </div>
            <div className="bg-emerald-50 px-3 py-3">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-2xl font-bold text-emerald-800">{formatPrice(welcomePrice)}</span>
                <span className="text-sm text-midnight-navy/40 line-through">{formatPrice(price)}</span>
                <span className="text-xs font-medium text-emerald-700">{WELCOME_PERCENT}% off</span>
              </p>
              <p className="mt-1.5 text-xs text-emerald-900/80">
                {hydrated && appliedCoupon === WELCOME_CODE
                  ? "✓ Already applied in your bag"
                  : "Added to your bag for you — no need to type it"}
              </p>
            </div>
          </div>
        )}

        {/* Bracelet + ring — Wix applies it automatically. */}
        <div className="rounded-xl border-2 border-dashed border-champagne-gold/60 bg-champagne-gold/5 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[0.7rem] font-bold uppercase tracking-wider text-champagne-gold">
              Bracelet + ring · {COMBO_PERCENT}% off the ring
            </p>
            <p className="text-[0.65rem] text-midnight-navy/55">No code needed</p>
          </div>
          <p className="mt-1.5 text-sm text-midnight-navy">
            {kind === "ring" ? (
              bagHasOther ? (
                <b className="text-emerald-700">
                  ✓ With the bracelet in your bag, this ring is {formatPrice(comboRingPrice)}
                </b>
              ) : (
                <>
                  Add any bracelet and this ring drops to <b>{formatPrice(comboRingPrice)}</b> —{" "}
                  {COMBO_PERCENT}% off.
                </>
              )
            ) : bagHasOther ? (
              <b className="text-emerald-700">✓ The ring in your bag gets {COMBO_PERCENT}% off with this bracelet</b>
            ) : (
              <>
                Add any ring with this bracelet and get {COMBO_PERCENT}% off the ring
                {comboRingPrice > 0 && (
                  <>
                    {" "}— rings from <b>{formatPrice(comboRingPrice)}</b>
                  </>
                )}
                .
              </>
            )}
          </p>
          {!bagHasOther && comboPieces.length > 0 && (
            <button
              type="button"
              onClick={() => setBrowsing((b) => !b)}
              aria-expanded={browsing}
              className="mt-2 inline-block cursor-pointer text-xs font-semibold text-midnight-navy underline underline-offset-2"
            >
              {browsing ? `Hide ${other}s ↑` : `Browse ${other}s →`}
            </button>
          )}
        </div>

        {/* The other kind of piece, inline — adding one unlocks the offer. */}
        {browsing && !bagHasOther && (
          <PairItWith
            items={comboPieces}
            title={kind === "ring" ? `Pick a bracelet — ${COMBO_PERCENT}% off this ring` : `Pick a ring — ${COMBO_PERCENT}% off it`}
            subtitle="Applied automatically in your bag."
            className=""
          />
        )}

        {/* Buy 2 get 1 — bracelets, once it's a Wix automatic discount. */}
        {showBuy2 && (
          <div className="rounded-xl border-2 border-dashed border-champagne-gold/60 bg-champagne-gold/5 p-3">
            <p className="text-[0.7rem] font-bold uppercase tracking-wider text-champagne-gold">
              Buy 2 Get 1 Free · bracelets
            </p>
            <p className="mt-1.5 text-sm text-midnight-navy">
              {bag.bracelets % 3 === 2
                ? <b className="text-emerald-700">✓ Add this to the 2 bracelets in your bag — the lowest-priced of the 3 is free</b>
                : "Pick any 3 bracelets — the lowest-priced one is free."}
            </p>
          </div>
        )}

        {/* Pay online — only once Razorpay is live (PREPAID_ENABLED). */}
        {PREPAID_ENABLED && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-600/40 bg-white px-3 py-2.5">
            <p className="text-sm text-midnight-navy">
              <b>{formatPrice(PREPAID_DISCOUNT)} off</b> when you pay by UPI / card
            </p>
            <span className="text-[0.65rem] text-midnight-navy/55">COD also available</span>
          </div>
        )}
      </div>
    </section>
  );
}
