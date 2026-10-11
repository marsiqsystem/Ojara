import { getAllProducts } from "@/lib/catalog";
import type { Product } from "@/lib/mockData";
import ProductCard from "@/components/ProductCard";
import ScrollRail from "@/components/ScrollRail";
import Link from "next/link";
import { LINES, groupByDesign, lineOf, pieceTypeOf } from "@/lib/lines";

// Rails by line and piece (lib/lines.ts): the Intentions bracelets and rings,
// and Adorn's stone jewellery. A pair of earrings used to land in "Bracelets of
// Intention" — anything without "ring" in its name did.
const ADORN_RAIL_ORDER = ["earrings", "set", "necklace", "pendant", "ring", "bracelet"];

// One labelled, swipeable rail. Same card sizes as before so rings and
// bracelets keep the exact look the collection already had.
function CollectionRail({
  heading,
  tagline,
  products,
  ariaLabel,
  more,
  eyebrow,
}: {
  heading: string;
  tagline: string;
  products: Product[];
  ariaLabel: string;
  /** "Shop all" link under the heading. */
  more?: { href: string; label: string };
  eyebrow?: string;
}) {
  if (products.length === 0) return null;

  return (
    <div className="mt-14 first:mt-0">
      <div className="mb-8 text-center">
        {eyebrow && <p className="mb-2 text-xs uppercase tracking-[0.35em] text-champagne-gold">{eyebrow}</p>}
        <h2 className="text-2xl text-midnight-navy sm:text-3xl">{heading}</h2>
        <p className="mx-auto mt-3 max-w-md text-warm-grey">{tagline}</p>
        {more && (
          <Link
            href={more.href}
            className="mt-3 inline-block border-b border-champagne-gold text-xs font-bold uppercase tracking-wider text-champagne-gold hover:text-midnight-navy"
          >
            {more.label}
          </Link>
        )}
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

// The homepage interleaves other sections between the rails, so each rail
// renders as its own section. `variant` picks which one — "both" keeps the
// original stacked Intentions layout for any other caller.
export default async function ProductGrid({
  variant = "both",
}: {
  variant?: "rings" | "bracelets" | "both" | "adorn";
}) {
  // One card per design (colours become swatches on the card).
  const products = groupByDesign(await getAllProducts());
  const intentions = products.filter((p) => lineOf(p) === "intentions");
  const rings = intentions.filter((p) => pieceTypeOf(p) === "ring");
  const bracelets = intentions.filter((p) => pieceTypeOf(p) !== "ring");
  // Adorn, earrings first (the easiest first buy), each kind in catalogue order.
  const adorn = products
    .filter((p) => lineOf(p) === "adorn" && p.stockCount > 0)
    .sort((a, b) => ADORN_RAIL_ORDER.indexOf(pieceTypeOf(a)) - ADORN_RAIL_ORDER.indexOf(pieceTypeOf(b)));

  if (variant === "adorn") {
    if (adorn.length === 0) return null;
    return (
      <section id="adorn" className="scroll-mt-24 border-y border-champagne-gold/20 bg-ivory px-4 sm:px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-[1600px]">
          <CollectionRail
            eyebrow={`New · OJARA ${LINES.adorn.name}`}
            heading="Stone jewellery"
            tagline="Necklace sets with matching earrings, in every colour — for festive days, parties and every day between."
            products={adorn.slice(0, 12)}
            ariaLabel="OJARA Adorn stone jewellery"
            more={{ href: LINES.adorn.href, label: `Shop all ${adorn.length} Adorn pieces` }}
          />
        </div>
      </section>
    );
  }

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
            eyebrow={`OJARA ${LINES.intentions.name}`}
            heading="Bracelets of Intention"
            tagline="Natural stone bracelets, worn in the old tradition of intention."
            products={bracelets}
            ariaLabel="Bracelets of Intention"
            more={{ href: "/intentions?type=bracelets", label: "Shop all bracelets" }}
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
