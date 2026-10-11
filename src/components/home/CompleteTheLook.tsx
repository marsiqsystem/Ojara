import Image from "next/image";
import Link from "next/link";
import { getAllProducts } from "@/lib/catalog";
import { groupByDesign } from "@/lib/lines";
import { formatPrice } from "@/lib/format";
import { lookPairs } from "@/lib/lookPairs";
import AddBothButton from "./AddBothButton";

/**
 * "Complete the look" — where the two lines meet. A gemstone bracelet styled
 * with a colour-matched Adorn piece, both addable in one tap. It sells the
 * second piece the way a stylist would ("these go together"), and turns a
 * ₹899 order into a ₹1,300+ one without inventing a discount: the price shown
 * is the plain sum. Renders nothing until Adorn has pieces in stock.
 */
export default async function CompleteTheLook() {
  const pairs = lookPairs(groupByDesign(await getAllProducts()), 3);
  if (pairs.length === 0) return null;

  return (
    <section aria-labelledby="complete-the-look" className="bg-sand/60 px-4 sm:px-6 py-14 sm:py-20">
      <div className="mx-auto max-w-[1600px]">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-champagne-gold">Intentions × Adorn</p>
          <h2 id="complete-the-look" className="mt-2 font-heading text-3xl text-midnight-navy sm:text-4xl">
            Complete the look
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-midnight-navy/70">
            A gemstone for what you carry, a little sparkle for how you show up — matched by colour, added in one tap.
          </p>
        </div>

        <ul className="mt-8 grid gap-4 sm:gap-6 md:grid-cols-3">
          {pairs.map(({ adorn, bracelet }) => (
            <li key={adorn.id} className="flex flex-col overflow-hidden rounded-2xl border border-champagne-gold/30 bg-ivory shadow-sm">
              <div className="relative grid grid-cols-2">
                {[bracelet, adorn].map((p) => (
                  <Link key={p.id} href={`/product/${p.id}`} className="group relative block aspect-square overflow-hidden bg-sand">
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="(min-width: 768px) 16vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </Link>
                ))}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-champagne-gold text-lg font-bold text-midnight-navy shadow-md"
                >
                  +
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="text-sm leading-snug text-midnight-navy">
                  <Link href={`/product/${bracelet.id}`} className="hover:text-champagne-gold">{bracelet.name}</Link>
                  <span className="text-midnight-navy/40"> + </span>
                  <Link href={`/product/${adorn.id}`} className="hover:text-champagne-gold">{adorn.name}</Link>
                </p>
                <p className="mt-2 text-xs text-midnight-navy/60">
                  {formatPrice(bracelet.price)} + {formatPrice(adorn.price)}
                </p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                  <p>
                    <span className="block text-[0.65rem] uppercase tracking-wider text-midnight-navy/50">Together</span>
                    <span className="text-xl font-semibold text-midnight-navy">{formatPrice(bracelet.price + adorn.price)}</span>
                  </p>
                  <AddBothButton
                    products={[bracelet, adorn]}
                    className="rounded-full bg-midnight-navy px-5 py-3 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-champagne-gold hover:bg-champagne-gold hover:text-midnight-navy"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
