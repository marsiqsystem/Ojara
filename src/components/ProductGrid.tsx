import { getAllProducts } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";
import ScrollRail from "@/components/ScrollRail";

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

        {/* One horizontal rail at every size (desktop included) with a swipe
            indicator beneath — swiped sideways rather than scrolled down. */}
        <ScrollRail ariaLabel="The collection" className="gap-4 pb-2 md:gap-5 lg:gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              sizes="(max-width: 767px) 45vw, (max-width: 1024px) 30vw, 23vw"
              className="w-[45vw] shrink-0 snap-start sm:w-[38vw] md:w-[calc((100%-2.5rem)/3)] lg:w-[calc((100%-3*1.5rem)/4)]"
            />
          ))}
        </ScrollRail>
      </div>
    </section>
  );
}
