"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/mockData";
import { formatPrice } from "@/lib/format";
import AddToCartButton from "@/components/AddToCartButton";
import { LOW_STOCK_THRESHOLD } from "@/lib/commerce/config";
import { colourLabelOf } from "@/lib/lines";

/**
 * The product card's markup. A design with colours (product.variants, from
 * lib/lines groupByDesign) is ONE card: its swatches swap the photo, colour,
 * price, link and what "add to bag" adds — the shopper picks a colour without
 * leaving the grid. Everything else renders exactly as a single piece.
 */
export default function ProductCardView({
  product,
  badge,
  sizes,
  className = "",
}: {
  product: Product;
  badge: string;
  sizes: string;
  className?: string;
}) {
  const variants = product.variants && product.variants.length > 1 ? product.variants : null;
  const [selectedId, setSelectedId] = useState(product.id);
  // The piece on show — a plain product (no `variants`), so the bag never
  // stores the whole colour list.
  const shown: Product = variants?.find((v) => v.id === selectedId) ?? product;
  const colour = colourLabelOf(shown);
  // Real stock from Wix — shown only when it's genuinely low.
  const lowStock = shown.stockCount > 0 && shown.stockCount <= LOW_STOCK_THRESHOLD;

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl bg-sand shadow-sm transition-all duration-500 md:hover:-translate-y-1 md:hover:shadow-2xl md:hover:shadow-champagne-gold/20 ${className}`}
    >
      <Link href={`/product/${shown.id}`} prefetch className="flex flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden sm:aspect-[4/5]">
          <Image
            src={shown.image}
            alt={colour ? `${shown.name} in ${colour}` : shown.name}
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Intention badge — front and center to the brand story */}
          <span className="absolute left-2 top-2 rounded-full bg-midnight-navy/90 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.15em] text-champagne-gold backdrop-blur-sm sm:left-4 sm:top-4 sm:px-4 sm:py-1.5 sm:text-xs sm:tracking-[0.2em]">
            {badge}
          </span>
          {lowStock && (
            <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-[0.6rem] font-bold text-rose-700 shadow-sm sm:bottom-4 sm:left-4 sm:text-xs">
              Only {shown.stockCount} left
            </span>
          )}
          {shown.stockCount === 0 && (
            <span className="absolute bottom-2 left-2 rounded-full bg-midnight-navy/85 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-ivory sm:bottom-4 sm:left-4 sm:text-xs">
              Sold out
            </span>
          )}
          {shown.isBundle && (
            <span className="absolute right-2 top-2 rounded-full bg-champagne-gold px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.15em] text-midnight-navy shadow-sm sm:right-4 sm:top-4 sm:px-4 sm:py-1.5 sm:text-xs sm:tracking-[0.2em]">
              Set
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3 pb-0 sm:p-6 sm:pb-0">
          <h3 className="line-clamp-2 text-sm leading-snug text-midnight-navy sm:text-xl sm:leading-normal">
            {shown.name}
          </h3>
          {/* Adorn: the colour sits under the design name, not in it. */}
          {colour && (
            <p className="mt-0.5 text-xs text-midnight-navy/60 sm:text-sm">
              {colour}
              {variants && <span className="text-midnight-navy/45"> · {variants.length} colours</span>}
            </p>
          )}
        </div>
      </Link>

      {/* Colour swatches — outside the link, so a tap picks a colour here. */}
      {variants && (
        <ul className="flex flex-wrap gap-1.5 px-3 pt-2 sm:px-6" aria-label="Colours">
          {variants.map((v) => {
            const active = v.id === shown.id;
            const label = colourLabelOf(v) ?? v.name;
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  aria-pressed={active}
                  aria-label={`${label}${v.stockCount <= 0 ? " (sold out)" : ""}`}
                  title={label}
                  className={`relative block h-7 w-7 cursor-pointer overflow-hidden rounded-full border-2 bg-midnight-navy/10 transition-colors sm:h-8 sm:w-8 ${
                    active ? "border-midnight-navy" : "border-midnight-navy/15 hover:border-champagne-gold"
                  } ${v.stockCount <= 0 ? "opacity-40" : ""}`}
                >
                  <Image src={v.image} alt="" fill sizes="32px" className="object-cover" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="p-3 pt-2 sm:p-6 sm:pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-baseline gap-1.5 text-sm text-midnight-navy sm:gap-2 sm:text-lg">
            {formatPrice(shown.price)}
            {shown.originalPrice && (
              <span className="text-[0.65rem] text-midnight-navy/60 line-through sm:text-sm">
                {formatPrice(shown.originalPrice)}
              </span>
            )}
          </span>
          {/* Icon-only: the "Add to Bag" label wrapped onto three lines inside the
              round button and read as cheap. The cart glyph matches the header's,
              so the affordance is already familiar. 44px keeps the tap target
              accessible, and ariaLabel carries the name the text used to. */}
          <AddToCartButton
            product={shown}
            ariaLabel={`Add ${shown.name}${colour ? ` (${colour})` : ""} to bag`}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-midnight-navy text-midnight-navy transition-colors hover:bg-midnight-navy hover:text-champagne-gold"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="9" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
              <path d="M2.5 3h2l2.2 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 7H6" />
            </svg>
          </AddToCartButton>
        </div>
      </div>
    </article>
  );
}
