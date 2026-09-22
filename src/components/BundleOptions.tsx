"use client";

import { formatPrice } from "@/lib/format";
import { BUY2GET1_LIVE, pieceKind } from "@/lib/commerce/offers";
import type { Product } from "@/lib/mockData";

const OPTIONS = [
  { count: 1, name: "Just one", free: 0 },
  { count: 3, name: "Buy 2 Get 1", free: 1 },
] as const;

/**
 * "Buy 2 Get 1 Free" as a ready-made choice on bracelet pages — one piece, or
 * three for the price of two. Only shown once the offer is a Wix automatic
 * discount (BUY2GET1_LIVE), so the card never promises a saving the order won't
 * get. Rings and the bracelet + ring combo are covered by ProductOffers.
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
  if (!BUY2GET1_LIVE || pieceKind(product) !== "bracelet") return null;

  const options = OPTIONS.filter((o) => o.count <= maxQty).map((o) => ({
    ...o,
    total: product.price * (o.count - o.free),
    was: o.free ? product.price * o.count : undefined,
  }));
  if (options.length < 2) return null;

  return (
    <section aria-labelledby="bundle-title" className="mt-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="bundle-title" className="text-xs font-semibold uppercase tracking-[0.25em] text-midnight-navy">
          Buy 2, get 1 free
        </h2>
        <span className="text-[0.65rem] text-midnight-navy/55">Applied in your bag</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3" role="radiogroup" aria-label="How many pieces">
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
              {o.free > 0 && (
                <span className="absolute -top-2.5 rounded-full bg-midnight-navy px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-champagne-gold">
                  Best value
                </span>
              )}
              <span className="text-sm font-semibold text-midnight-navy">{o.name}</span>
              <span className="mt-0.5 text-[0.66rem] leading-tight text-midnight-navy/60">
                {o.free ? `${o.count} pieces · 1 free` : "1 piece"}
              </span>
              <span className="mt-2 text-base font-bold tabular-nums text-midnight-navy">{formatPrice(o.total)}</span>
              {o.was && <span className="text-[0.66rem] tabular-nums text-midnight-navy/40 line-through">{formatPrice(o.was)}</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[0.7rem] text-midnight-navy/55">
        Mix any bracelets — the lowest-priced of every three is free.
      </p>
    </section>
  );
}
