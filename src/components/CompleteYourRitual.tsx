import Image from "next/image";
import Link from "next/link";
import { getAllProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

/**
 * Cross-sell rail shown at the foot of a product page. Surfaces three other
 * pieces to keep the shopper browsing after they've considered the main item.
 */
export default async function CompleteYourRitual({
  currentId,
}: {
  currentId: string;
}) {
  const products = await getAllProducts();
  const suggestions = products
    .filter((product) => product.id !== currentId)
    .slice(0, 3);

  return (
    <section className="border-t border-champagne-gold/30 bg-sand px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center sm:mb-12">
          <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">
            Pair It With
          </span>
          <h2 className="mt-4 text-3xl uppercase tracking-[0.15em] text-midnight-navy sm:text-4xl">
            Complete Your Ritual
          </h2>
        </div>

        {/* Mobile: horizontal scroll rail of compact cards. Desktop: 3-up grid. */}
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto hide-scrollbar -mx-6 px-6 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-8 sm:overflow-visible sm:px-0">
          {suggestions.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              prefetch
              className="cursor-pointer group flex w-[45%] flex-shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-ivory shadow-sm transition-all duration-500 ease-out sm:w-auto md:hover:-translate-y-1 md:hover:shadow-2xl md:hover:shadow-champagne-gold/20 active:scale-95"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 45vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute left-2 top-2 rounded-full bg-midnight-navy/90 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.15em] text-champagne-gold backdrop-blur-sm sm:left-4 sm:top-4 sm:px-4 sm:py-1.5 sm:text-xs sm:tracking-[0.2em]">
                  {product.intention}
                </span>
              </div>

              <div className="flex flex-col gap-0.5 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <h3 className="text-xs text-midnight-navy sm:text-lg">
                  {product.name}
                </h3>
                <span className="flex-shrink-0 text-xs font-medium text-midnight-navy sm:text-lg">
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
