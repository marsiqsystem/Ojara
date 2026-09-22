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

// The homepage now interleaves other sections between the two rails (bracelets
// sit high, after the reel; rings sit lower, after the brand story), so each
// rail renders as its own section. `variant` picks which one — "both" keeps the
// original stacked layout for any other caller.
export default async function ProductGrid({
  variant = "both",
}: {
  variant?: "rings" | "bracelets" | "both";
}) {
  const products = await getAllProducts();
  const rings = products.filter(isRing);
  const bracelets = products.filter((p) => !isRing(p));

  const showRings = variant === "rings" || variant === "both";
  const showBracelets = variant === "bracelets" || variant === "both";

  // The #collection anchor (the hero's "Shop bracelets" button) should land on
  // whichever rail appears first in the flow — bracelets when it's shown alone.
  // Everything else that says "Shop" goes to the real shop page, /collection.
  const anchorId = showBracelets ? "collection" : "rings";

  return (
    <section
      id={anchorId}
      className="scroll-mt-24 border-y border-champagne-gold/20 bg-ivory px-4 sm:px-6 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-[1600px]">
        {showBracelets && (
          <CollectionRail
            heading="Bracelets of Intention"
            tagline="Natural stone bracelets, worn in the old tradition of intention."
            products={bracelets}
            ariaLabel="Bracelets of Intention"
          />
        )}
        {showRings && (
          <CollectionRail
            heading="Rings of Intention"
            tagline="Gemstone rings, cleansed and charged — carry your intention on your hand."
            products={rings}
            ariaLabel="Rings of Intention"
          />
        )}
      </div>
    </section>
  );
}
