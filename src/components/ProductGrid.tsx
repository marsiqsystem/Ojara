import { getAllProducts } from "@/lib/catalog";
import type { Product } from "@/lib/mockData";
import ProductCard from "@/components/ProductCard";
import ScrollRail from "@/components/ScrollRail";

// Split the catalog into rings vs. everything-else by product name. The owner
// added rings to the Wix store alongside the original bracelets; rings carry
// "Ring" in their name ("Lapis Lazuli Ring", "Amethyst Ring", ...) while every
// other piece is a bracelet/set. Matching on the name keeps this working off
// live Wix data without depending on a separate Wix collection being tagged.
const isRing = (p: Product) => /\bring\b/i.test(p.name);

// One labelled, swipeable rail. Same card sizes as before so rings and
// bracelets keep the exact look the collection already had.
function CollectionRail({
  heading,
  tagline,
  products,
  ariaLabel,
}: {
  heading: string;
  tagline: string;
  products: Product[];
  ariaLabel: string;
}) {
  if (products.length === 0) return null;

  return (
    <div className="mt-14 first:mt-0">
      <div className="mb-8 text-center">
        <h2 className="text-2xl text-midnight-navy sm:text-3xl">{heading}</h2>
        <p className="mx-auto mt-3 max-w-md text-warm-grey">{tagline}</p>
      </div>

      <ScrollRail ariaLabel={ariaLabel} className="gap-4 pb-2 md:gap-5 lg:gap-6">
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
  );
}

export default async function ProductGrid() {
  const products = await getAllProducts();
  const rings = products.filter(isRing);
  const bracelets = products.filter((p) => !isRing(p));

  return (
    <section
      id="collection"
      className="scroll-mt-24 border-y border-champagne-gold/20 bg-ivory px-6 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        {/* Two labelled rails — rings first, then bracelets — each swiped
            sideways rather than scrolled down, same pattern as before. */}
        <CollectionRail
          heading="Rings of Intention"
          tagline="Gemstone rings, cleansed and charged — carry your intention on your hand."
          products={rings}
          ariaLabel="Rings of Intention"
        />
        <CollectionRail
          heading="Bracelets of Intention"
          tagline="Natural stone bracelets, worn in the old tradition of intention."
          products={bracelets}
          ariaLabel="Bracelets of Intention"
        />
      </div>
    </section>
  );
}
