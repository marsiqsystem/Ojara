import Image from "next/image";
import Link from "next/link";
import { getAllProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

/**
 * Bottom-of-page cross-sell. Rotates the catalogue so it starts just after the
 * current product, surfacing a different, wider spread of pieces than the
 * "Complete Your Ritual" rail higher up the page.
 */
export default async function YouMayAlsoLike({ currentId }: { currentId: string }) {
  const products = await getAllProducts();
  const currentIndex = products.findIndex((p) => p.id === currentId);
  const start = currentIndex === -1 ? 0 : currentIndex;

  const suggestions = Array.from({ length: products.length }, (_, i) => {
    return products[(start + i + 1) % products.length];
  })
    .filter((product) => product.id !== currentId)
    .slice(0, 4);

  return (
    <section className="border-t border-champagne-gold/30 bg-ivory px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center sm:mb-14">
          <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">
            Keep Exploring
          </span>
          <h2 className="mt-4 font-heading text-3xl text-midnight-navy sm:text-4xl">
            You May Also Like
          </h2>
        </div>

        {/* Mobile: horizontal scroll rail of compact cards. Desktop: 4-up grid. */}
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto hide-scrollbar -mx-6 px-6 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-8 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {suggestions.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              prefetch
              className="cursor-pointer group flex w-[42%] flex-shrink-0 snap-start flex-col transition-all duration-150 sm:w-auto md:hover:-translate-y-1 active:scale-95"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand shadow-sm transition-all duration-500 ease-out md:group-hover:shadow-xl md:group-hover:shadow-champagne-gold/20">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 42vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <div className="mt-3 sm:mt-4">
                <p className="text-[0.6rem] uppercase tracking-[0.2em] text-champagne-gold sm:text-[0.65rem] sm:tracking-[0.25em]">
                  {product.intention}
                </p>
                <h3 className="mt-1.5 text-xs text-midnight-navy sm:mt-2 sm:text-base">
                  {product.name}
                </h3>
                <p className="mt-1 text-xs font-medium text-midnight-navy/85 sm:text-sm">
                  {formatPrice(product.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
