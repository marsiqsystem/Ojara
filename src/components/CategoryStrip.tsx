import Link from "next/link";
import Image from "next/image";
import {
  getCategories,
  getProductsByCategory,
  type Category,
} from "@/lib/catalog";
import { groupByDesign } from "@/lib/lines";
import { COMBO_PERCENT, isOfferLive } from "@/lib/commerce/offers";
import ScrollRail from "@/components/ScrollRail";

// Viora-style category strip — horizontal scrollable row with rounded images
// and labels. Intentions collections first ("I need protection"), then Adorn's
// piece and occasion pages ("I want earrings", "something festive").
const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=300&q=80`;

// cat.image may be a bare Unsplash photo id, a local path, or an absolute url
// (Wix CDN / an Unsplash fallback). Only the bare id needs img() — wrapping an
// absolute url produced https://images.unsplash.com/https://... and broke every tile.
const srcOf = (image: string) =>
  image.startsWith("http") || image.startsWith("/") ? image : img(image);

// The offer a category's pieces earn, for the desktop card's badge — only
// offers Wix actually honours at checkout (offers.ts isOfferLive).
const offerOf = (cat: Category): string | undefined => {
  if (cat.slug === "bracelets" && isOfferLive("b2g1"))
    return "Buy 2 Get 1 Free";
  if (cat.slug === "rings" && isOfferLive("combo"))
    return `${COMBO_PERCENT}% off with any bracelet`;
  if (cat.pieceType === "set" && isOfferLive("b2g1Adorn"))
    return "Buy 2 Get 1 Free";
  return undefined;
};

// Desktop grid columns by tile count — whole class names so Tailwind keeps them.
const GRID_COLS: Record<number, string> = {
  1: "lg:grid-cols-1 lg:max-w-sm",
  2: "lg:grid-cols-2 lg:max-w-3xl",
  3: "lg:grid-cols-3 lg:max-w-5xl",
  4: "lg:grid-cols-4 lg:max-w-7xl",
};

export default async function CategoryStrip() {
  // Every Intentions collection, then Adorn's piece and occasion pages
  // (getCategories adds those only once Adorn has pieces).
  const categories = await getCategories();
  // Pieces per tile, counted the way the category page lists them (one per design).
  const counts = await Promise.all(
    categories.map(
      async (cat) => groupByDesign(await getProductsByCategory(cat)).length,
    ),
  );

  return (
    <section className="border-b border-champagne-gold/20 bg-ivory px-4 sm:px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-[1600px]">
        {/* Header row */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-heading text-2xl text-midnight-navy sm:text-3xl">
              Categories
            </h2>
            <p className="mt-1 text-sm text-midnight-navy/60">
              {categories.some((c) => c.group === "adorn")
                ? "Natural gemstone bracelets & rings, and stone jewellery."
                : "Browse every OJARA collection."}
            </p>
          </div>
          <Link
            href="/collection"
            prefetch
            className="hidden text-sm font-medium tracking-wide text-champagne-gold transition-colors duration-300 hover:text-midnight-navy sm:inline-flex"
          >
            View all
          </Link>
        </div>

        {/* Phones and tablets: a start-aligned swipe rail (with the dash
            indicator once it overflows). Circular medallions with a gold ring
            give every photo a strong, consistent edge and crop the loose product
            stills down to just the piece (owner call, 2026-09-12). */}
        <div className="lg:hidden">
          <ScrollRail ariaLabel="Categories" className="gap-8 sm:gap-12">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                prefetch
                className="group flex w-24 flex-shrink-0 snap-start flex-col items-center gap-4 sm:w-28"
              >
                {/* Circular medallion — solid sand ground, a gold ring, and a soft
                  drop shadow read as a deliberate, premium tile. Hover lifts it
                  and thickens the ring. */}
                <div className="relative h-24 w-24 overflow-hidden rounded-full bg-sand shadow-md shadow-midnight-navy/10 ring-1 ring-champagne-gold/45 transition-all duration-300 ease-out group-hover:-translate-y-1.5 group-hover:shadow-lg group-hover:shadow-champagne-gold/25 group-hover:ring-2 group-hover:ring-champagne-gold sm:h-28 sm:w-28">
                  {cat.image ? (
                    <Image
                      src={srcOf(cat.image)}
                      alt={cat.label}
                      fill
                      sizes="112px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl text-champagne-gold">
                      ✦
                    </div>
                  )}
                </div>

                {/* Label — reserves two lines' height so one- and two-word labels
                  line up along the top edge across the whole row. */}
                <span className="flex min-h-[2rem] items-start justify-center text-center text-[0.7rem] font-medium uppercase leading-snug tracking-[0.12em] text-midnight-navy/80 transition-colors duration-300 group-hover:text-champagne-gold sm:text-xs">
                  {cat.label}
                </span>
              </Link>
            ))}
          </ScrollRail>
        </div>

        {/* Laptop and desktop: large photo cards in a centred grid. Four small
            circles floating in a 1600px row read as empty space (owner,
            2026-10-14). Square photos so the team's Wix banners show whole;
            the name, piece count and live offer sit under the photo, never on
            it (a badge on the photo covered the banners' own text). */}
        <ul
          className={`mx-auto hidden gap-6 lg:grid xl:gap-8 ${
            GRID_COLS[categories.length] ?? "lg:grid-cols-4 lg:max-w-7xl"
          }`}
        >
          {categories.map((cat, i) => {
            const offer = offerOf(cat);
            return (
              <li key={cat.slug}>
                <Link
                  href={`/category/${cat.slug}`}
                  prefetch
                  className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white/60 shadow-sm shadow-midnight-navy/5 ring-1 ring-champagne-gold/30 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-champagne-gold/20 hover:ring-champagne-gold"
                >
                  <div className="relative aspect-square overflow-hidden bg-sand">
                    {cat.image ? (
                      <Image
                        src={srcOf(cat.image)}
                        alt={cat.label}
                        fill
                        sizes="(min-width: 1280px) 300px, 25vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl text-champagne-gold">
                        ✦
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 items-start justify-between gap-3 px-4 py-4 xl:px-5">
                    <div>
                      <h3 className="font-heading text-lg leading-tight text-midnight-navy xl:text-xl">
                        {cat.label}
                      </h3>
                      <p className="mt-0.5 text-xs uppercase tracking-[0.15em] text-midnight-navy/50">
                        {counts[i]} {counts[i] === 1 ? "piece" : "pieces"}
                      </p>
                      {offer && (
                        <p className="mt-1.5 text-xs font-semibold text-emerald-700">
                          ✦ {offer}
                        </p>
                      )}
                    </div>
                    <span className="hidden shrink-0 items-center gap-1 self-end text-sm xl:inline-flex font-medium text-champagne-gold transition-colors duration-300 group-hover:text-midnight-navy">
                      Shop
                      <span
                        aria-hidden="true"
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
