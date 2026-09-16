import type { Product } from "@/lib/mockData";
import { getAllProducts } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";
import ScrollRail from "@/components/ScrollRail";
import { ritualPairsFor } from "@/lib/commerce/bundle";

/**
 * Bottom-of-page cross-sell. Rotates the catalogue so it starts just after the
 * current product, surfacing a wider spread of pieces — and skips whatever the
 * "Complete Your Ritual" rail above already offered, so no piece appears twice.
 */
export default async function YouMayAlsoLike({ product }: { product: Product }) {
  const products = await getAllProducts();
  const shown = new Set([product.id, ...ritualPairsFor(product, products).map((p) => p.id)]);
  const currentIndex = products.findIndex((p) => p.id === product.id);
  const start = currentIndex === -1 ? 0 : currentIndex;

  const suggestions = Array.from(
    { length: products.length },
    (_, i) => products[(start + i + 1) % products.length],
  )
    .filter((p) => !shown.has(p.id) && p.stockCount > 0)
    .slice(0, 4);

  if (suggestions.length === 0) return null;

  return (
    <section className="border-t border-champagne-gold/30 bg-sand/40 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center sm:mb-14">
          <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">
            Keep Exploring
          </span>
          <h2 className="mt-4 font-heading text-3xl text-midnight-navy sm:text-4xl">
            You May Also Like
          </h2>
        </div>

        <ScrollRail ariaLabel="More pieces you may like" className="gap-4 pb-2 md:gap-5 lg:gap-6">
          {suggestions.map((p) => (
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
