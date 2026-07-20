"use client";

import Image from "next/image";
import Link from "next/link";
import { getProductById as getMockProductById } from "@/lib/mockData";
import { formatPrice } from "@/lib/format";
import { useCatalog } from "@/context/catalogContext";
import { useCartStore, useCartHydrated } from "@/lib/store/useCartStore";

/**
 * Reads the persisted browsing history and shows the last few pieces the
 * shopper looked at. Two flavours:
 *  - "section": a full page section (used at the bottom of the PDP)
 *  - "compact": a slim rail (used in the empty cart drawer)
 */
export default function RecentlyViewed({
  currentId,
  variant = "section",
  onNavigate,
}: {
  currentId?: string;
  variant?: "section" | "compact";
  onNavigate?: () => void;
}) {
  const hydrated = useCartHydrated();
  const recentlyViewed = useCartStore((state) => state.recentlyViewed);
  // Live catalog (Wix when enabled) so the price here matches the PDP/cart.
  // Falls back to the mock twin only if the id isn't in the live catalog.
  const catalog = useCatalog();
  const resolve = (id: string) =>
    catalog.find((p) => p.id === id) ?? getMockProductById(id);

  const items = hydrated
    ? recentlyViewed
        .filter((id) => id !== currentId)
        .map(resolve)
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
        .slice(0, 3)
    : [];

  if (items.length === 0) return null;

  if (variant === "compact") {
    return (
      <div>
        <p className="text-center text-xs uppercase tracking-[0.3em] text-champagne-gold">
          Recently Viewed
        </p>
        <ul className="mt-5 space-y-3">
          {items.map((product) => (
            <li key={product.id}>
              <Link
                href={`/product/${product.id}`}
                prefetch
                onClick={onNavigate}
                className="group flex items-center gap-4"
              >
                <div className="relative h-16 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-sand">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="56px"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                </div>
                 <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm text-midnight-navy">
                    {product.name}
                  </p>
                  <p className="text-sm text-midnight-navy/85">
                    {formatPrice(product.price)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <section className="border-t border-champagne-gold/30 bg-sand px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center sm:mb-12">
          <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">
            Your Journey
          </span>
          <h2 className="mt-4 font-heading text-3xl text-midnight-navy sm:text-4xl">
            Recently Viewed
          </h2>
        </div>

        {/* Mobile: horizontal scroll rail of compact cards. Desktop: centred grid. */}
        <div className="mx-auto flex max-w-4xl snap-x snap-mandatory gap-4 overflow-x-auto hide-scrollbar -mx-6 px-6 pb-2 sm:mx-auto sm:grid sm:grid-cols-3 sm:gap-8 sm:overflow-visible sm:px-6">
          {items.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              prefetch
              className="cursor-pointer group flex w-[45%] flex-shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-ivory shadow-sm transition-all duration-500 ease-out sm:w-auto md:hover:-translate-y-1 md:hover:shadow-xl md:hover:shadow-champagne-gold/20 active:scale-95"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 45vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col gap-0.5 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <h3 className="text-xs text-midnight-navy sm:text-base">
                  {product.name}
                </h3>
                <span className="flex-shrink-0 text-xs font-medium text-midnight-navy sm:text-base">
                  {formatPrice(product.price)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
