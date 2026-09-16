import type { Product } from "@/lib/mockData";
import { getAllProducts } from "@/lib/catalog";
import { pickUpsellProducts } from "@/lib/commerce/bundle";
import ProductCard from "@/components/ProductCard";
import ScrollRail from "@/components/ScrollRail";

/** How many pieces the "Complete Your Ritual" rail offers. */
export const RITUAL_PAIR_COUNT = 4;

/**
 * The pieces "Complete Your Ritual" pairs with `product`: same stone / intention
 * family first (the affinity matcher the checkout upsell uses), in stock only.
 * Exported so "You May Also Like" can avoid repeating them.
 */
export const ritualPairsFor = (product: Product, catalog: Product[]): Product[] =>
  pickUpsellProducts(product, catalog, [product.id], RITUAL_PAIR_COUNT);

/**
 * Cross-sell rail on the product page. This used to show the first three pieces
 * in the catalogue on every product — the same three rings everywhere, with no
 * way to add one. It now pairs by affinity and uses the shared ProductCard, so
 * each piece can go straight into the bag.
 */
export default async function CompleteYourRitual({ product }: { product: Product }) {
  const pairs = ritualPairsFor(product, await getAllProducts());
  if (pairs.length === 0) return null;

  return (
    <section className="border-t border-champagne-gold/30 bg-ivory px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center sm:mb-12">
          <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">
            Pair It With
          </span>
          <h2 className="mt-4 text-3xl uppercase tracking-[0.15em] text-midnight-navy sm:text-4xl">
            Complete Your Ritual
          </h2>
        </div>

        {/* Same rail + card sizing as the home page collection rails. */}
        <ScrollRail ariaLabel="Pieces to pair with this one" className="gap-4 pb-2 md:gap-5 lg:gap-6">
          {pairs.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 33vw, 25vw"
              className="w-[45vw] shrink-0 snap-start sm:w-[38vw] md:w-[calc((100%-2.5rem)/3)] lg:w-[calc((100%-3*1.5rem)/4)]"
            />
          ))}
        </ScrollRail>
      </div>
    </section>
  );
}
