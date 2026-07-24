import { getAllProducts } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";

export default async function ProductGrid() {
  const products = await getAllProducts();

  return (
    <section
      id="collection"
      className="scroll-mt-24 border-y border-champagne-gold/20 bg-ivory px-6 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl text-midnight-navy sm:text-4xl">
            The Collection
          </h2>
          <p className="mx-auto mt-4 max-w-md text-warm-grey">
            Sacred objects and curated sets, each cleansed and charged with
            intention.
          </p>
        </div>

        {/* Mobile: a single row of the same small cards, swiped sideways rather
            than scrolled down. Desktop returns to the standard wrapping grid. */}
        <div className="hide-scrollbar -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4 lg:gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              sizes="(max-width: 767px) 45vw, (max-width: 1024px) 33vw, 25vw"
              className="w-[45vw] shrink-0 snap-start md:w-auto md:shrink"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
