"use client";

import Image from "next/image";
import { formatPrice } from "@/lib/format";
import type { LookRail, OfferRail } from "@/lib/commerce/useUpsellSuggestions";
import type { Product } from "@/lib/mockData";
import AddToCartButton from "@/components/AddToCartButton";

/**
 * Checkout's "one more piece" rows — a compact version of the bag's offer rows,
 * so the form stays close. One row per offer within reach (more bracelets for
 * buy 2 get 1, a ring for bracelet + ring). Adding stays in checkout: the order
 * list, the offers and the total update in place.
 */
export default function CheckoutOfferRails({
  rails,
  look = null,
}: {
  rails: OfferRail[];
  /** "Complete the look" — the other line, after the offer rows. */
  look?: LookRail | null;
}) {
  const rows = [
    ...rails.map(({ nudge, products }) => ({ key: nudge.offer, title: nudge.message, detail: nudge.detail, products })),
    ...(look ? [{ key: "look", title: look.title, detail: look.subtitle, products: look.products }] : []),
  ];
  if (rows.length === 0) return null;

  return (
    <div className="space-y-4">
      {rows.map(({ key, title, detail, products }) => (
        <section key={key} aria-label={title}>
          <p className="text-xs font-bold text-midnight-navy">{title}</p>
          <p className="text-[0.7rem] text-midnight-navy/60">{detail}</p>
          <div className="-mx-5 mt-2 flex snap-x scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-1 hide-scrollbar">
            {products.map((p: Product) => (
              <div
                key={p.id}
                className="w-28 shrink-0 snap-start overflow-hidden rounded-lg border border-champagne-gold/30 bg-white"
              >
                <span className="relative block aspect-square bg-sand">
                  <Image src={p.image} alt={p.name} fill sizes="112px" className="object-cover" />
                </span>
                <div className="p-2">
                  <p className="line-clamp-1 text-[0.7rem] font-medium text-midnight-navy">{p.name}</p>
                  <p className="text-xs font-bold text-midnight-navy">{formatPrice(p.price)}</p>
                  <AddToCartButton
                    product={p}
                    ariaLabel={`Add ${p.name} to your order`}
                    openBag={false}
                    className="mt-1.5 flex h-7 w-full items-center justify-center rounded-full bg-midnight-navy text-[0.62rem] font-semibold uppercase tracking-wide text-champagne-gold"
                  >
                    + Add
                  </AddToCartButton>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
