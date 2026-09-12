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
      <div className="mx-auto max-w-7xl">
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

        {/* Category row. Below lg it's a start-aligned swipe rail (with the dash
            indicator once it overflows); from lg up the tiles sit CENTERED as a
            tight group rather than stretched across the full width, which read
            as vague floaters. Circular medallions with a gold ring give every
            photo a strong, consistent edge and crop the loose product stills
            (with their own pale backgrounds and baked-in labels) down to just
            the piece (owner call, 2026-09-12). */}
        <ScrollRail
          ariaLabel="Categories"
          className="gap-7 sm:gap-9 lg:justify-center lg:gap-12"
        >
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
    </section>
  );
}
