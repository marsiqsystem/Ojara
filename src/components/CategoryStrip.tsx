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

        {/* Category row. On desktop the handful of tiles spread across the full
            width (justify-between) — the pre-existing look. Once more categories
            are added and they stop fitting, the flex overflows and it becomes a
            swipe rail with the indicator, same as it already is on mobile. */}
        <ScrollRail
          ariaLabel="Categories"
          className="gap-5 sm:gap-6 lg:justify-between lg:gap-4"
        >
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              prefetch
              className="group flex w-20 flex-shrink-0 snap-start flex-col items-center gap-3 sm:w-24"
            >
              {/* Rounded image */}
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-sand ring-2 ring-transparent transition-all duration-300 group-hover:ring-champagne-gold group-hover:shadow-lg group-hover:shadow-champagne-gold/15 sm:h-24 sm:w-24">
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
                    sizes="96px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl text-champagne-gold">
                    ✦
                  </div>
                )}
              </div>

              {/* Label */}
              <span className="text-center text-[0.65rem] font-medium leading-tight tracking-wide text-midnight-navy/80 transition-colors duration-300 group-hover:text-midnight-navy sm:text-xs">
                {cat.label}
              </span>
            </Link>
          ))}
        </ScrollRail>
      </div>
    </section>
  );
}
