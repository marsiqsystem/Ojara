import Link from "next/link";
import Image from "next/image";
import { getCategories } from "@/lib/catalog";
import ScrollRail from "@/components/ScrollRail";

// Viora-style category strip — horizontal scrollable row with rounded images
// and labels. Shows all 9 categories (4 intentions + 5 types) so the shopper
// can navigate by either mental model: "I need protection" or "I want a bracelet."
const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=300&q=80`;

export default async function CategoryStrip() {
  const categories = await getCategories();

  return (
    <section className="border-b border-champagne-gold/20 bg-ivory px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        {/* Header row */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-heading text-2xl text-midnight-navy sm:text-3xl">
              Categories
            </h2>
            <p className="mt-1 text-sm text-midnight-navy/60">
              Browse every OJARA collection.
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

        {/* Category row. Below lg it's a start-aligned swipe rail (with the
            dash indicator once it overflows); from lg up the handful of tiles
            sit evenly CENTERED rather than stretched to the container edges,
            which read as vague, unevenly-spaced floaters (owner call
            2026-09-12). */}
        <ScrollRail
          ariaLabel="Categories"
          className="gap-6 sm:gap-8 lg:justify-center lg:gap-12"
        >
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              prefetch
              className="group flex w-24 flex-shrink-0 snap-start flex-col items-center gap-3.5 sm:w-28"
            >
              {/* Framed tile — a defined border, a soft ivory→sand ground and a
                  gentle shadow give each photo a real edge, so the product
                  stills (many of which have their own pale backgrounds) sit
                  inside a tile instead of floating as loose cut-outs. */}
              <div className="relative h-24 w-24 overflow-hidden rounded-3xl border border-champagne-gold/25 bg-gradient-to-b from-white to-sand/50 p-1.5 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-champagne-gold/60 group-hover:shadow-lg group-hover:shadow-champagne-gold/20 sm:h-28 sm:w-28">
                {cat.image ? (
                  <div className="relative h-full w-full overflow-hidden rounded-[1.15rem]">
                    <Image
                      // cat.image may be a bare Unsplash photo id, a local path, or
                      // an absolute url (Wix CDN / an Unsplash fallback). Only the
                      // bare id needs img() — wrapping an absolute url produced
                      // https://images.unsplash.com/https://... and broke every tile.
                      src={
                        cat.image.startsWith("http") || cat.image.startsWith("/")
                          ? cat.image
                          : img(cat.image)
                      }
                      alt={cat.label}
                      fill
                      sizes="112px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-[1.15rem] text-2xl text-champagne-gold">
                    ✦
                  </div>
                )}
              </div>

              {/* Label — reserves two lines' height so one- and two-word labels
                  line up along the top edge across the whole row. */}
              <span className="flex min-h-[2.1rem] items-start justify-center text-center text-xs font-medium leading-tight tracking-wide text-midnight-navy/85 transition-colors duration-300 group-hover:text-champagne-gold sm:text-[0.8rem]">
                {cat.label}
              </span>
            </Link>
          ))}
        </ScrollRail>
      </div>
    </section>
  );
}
