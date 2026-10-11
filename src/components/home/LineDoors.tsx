import Image from "next/image";
import Link from "next/link";
import { getAllProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { LINES, lineOf, type Line } from "@/lib/lines";

/**
 * "Two ways to wear OJARA" — the home page's fork, straight after the trust
 * strip. Two doors instead of one long mixed grid: a shopper decides "meaning
 * or sparkle" in a second and every piece after that is relevant to them.
 * Each door states what's inside, how many pieces and the entry price, so the
 * click is already a qualified one.
 *
 * Before Adorn has pieces, its door is a "coming soon" sign-up instead — the
 * new line is announced to everyone already shopping, at no cost to them.
 */
export default async function LineDoors() {
  const products = await getAllProducts();
  const doors = (["intentions", "adorn"] as Line[]).map((key) => {
    const pieces = products.filter((p) => lineOf(p) === key && p.stockCount > 0);
    return {
      line: LINES[key],
      count: pieces.length,
      from: pieces.length ? Math.min(...pieces.map((p) => p.price)) : 0,
      // Intentions: OJARA's own footage still (bracelets and rings worn together).
      image: key === "intentions" ? "/media/reels/hero-loop.jpg" : pieces[0]?.image,
    };
  });

  return (
    <section aria-labelledby="line-doors" className="bg-ivory px-4 sm:px-6 pt-10 sm:pt-14">
      <div className="mx-auto max-w-[1600px]">
        <h2 id="line-doors" className="sr-only">
          Two ways to wear OJARA
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:gap-5">
          {doors.map(({ line, count, from, image }) => {
            const live = count > 0;
            return (
              <li key={line.key}>
                <Link
                  href={line.href}
                  className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-midnight-navy sm:aspect-[16/10]"
                >
                  {image && (
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="50vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  {!image && (
                    <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(230,205,152,0.35),transparent_55%)]" />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-midnight-navy/90 via-midnight-navy/35 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-3.5 text-ivory sm:p-7">
                    <span className="block text-[0.6rem] uppercase tracking-[0.3em] text-champagne-gold sm:text-xs">
                      OJARA {line.name}
                    </span>
                    <span className="mt-1 block font-heading text-xl leading-tight sm:text-4xl">{line.promise}</span>
                    <span className="mt-1 block text-[0.7rem] leading-snug text-ivory/80 sm:text-sm">{line.descriptor}</span>
                    <span className="mt-2 block text-[0.7rem] font-semibold text-ivory sm:mt-3 sm:text-sm">
                      {live ? `${count} pieces · from ${formatPrice(from)}` : "Coming soon"}
                    </span>
                    <span className="mt-2 inline-block border-b border-champagne-gold text-[0.65rem] font-bold uppercase tracking-wider text-champagne-gold sm:mt-3 sm:text-xs">
                      {live ? `Shop ${line.name}` : "Get notified"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
