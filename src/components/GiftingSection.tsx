import { getAllProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { FREE_GIFT_WRAP_MINIMUM, GIFT_WRAP_FEE } from "@/lib/commerce/pricing";
import ProductCard from "@/components/ProductCard";
import ScrollRail from "@/components/ScrollRail";

// Pieces whose names read as gifts (love, calm, the moon and pearls), first.
const GIFT_TERMS = ["love", "rose quartz", "moonstone", "pearl", "amethyst", "citrine", "evil eye"];
const GIFT_PICKS = 8;

/**
 * Gifting on the home page. It used to show the first two products as "Gift Box"
 * sets "complete with a handwritten intention card" — neither was true: there
 * are no gift boxes, and the note comes with the paid gift wrap. It now states
 * the real offer (wrap + handwritten note, free at the top ladder step) over a
 * rail of in-stock pieces that make natural gifts, each addable in one tap.
 */
export default async function GiftingSection() {
  const products = (await getAllProducts()).filter((p) => p.stockCount > 0);
  const score = (name: string) => {
    const n = name.toLowerCase();
    const i = GIFT_TERMS.findIndex((t) => n.includes(t));
    return i === -1 ? GIFT_TERMS.length : i;
  };
  const picks = [...products].sort((a, b) => score(a.name) - score(b.name)).slice(0, GIFT_PICKS);
  if (picks.length === 0) return null;

  return (
    <section id="gifting" className="scroll-mt-24 border-y border-champagne-gold/30 bg-midnight-navy px-6 py-16 text-ivory sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">Gifting made easy</span>
          <h2 className="mt-4 font-heading text-3xl uppercase tracking-[0.12em] text-champagne-gold sm:text-4xl">
            Give the Gift of Intention
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-ivory/75">
            Add gift wrap with your handwritten note in the bag for {formatPrice(GIFT_WRAP_FEE)} — FREE on
            orders of {formatPrice(FREE_GIFT_WRAP_MINIMUM)}+.
          </p>
        </div>

        <ScrollRail ariaLabel="Gift picks" className="gap-4 pb-2 md:gap-5 lg:gap-6">
          {picks.map((p) => (
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
