import type { Metadata } from "next";
import Link from "next/link";
import { getAllProducts } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";
import ValueProps from "@/components/ValueProps";
import BackButton from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Our Collection",
  description:
    "Every OJARA piece in one place — natural gemstone bracelets, cleansed and charged, worn as a daily reminder of your intention.",
  alternates: { canonical: "/collection" },
  openGraph: {
    title: "Our Collection | OJARA",
    description:
      "Every OJARA piece in one place — natural gemstone bracelets, cleansed and charged.",
    url: "/collection",
    type: "website",
  },
};

// Dedicated "Our Collection" page — the full catalogue in a proper grid, reached
// from the Hero's "Shop the Collection" button. The landing page keeps its own
// #collection preview row untouched; this is the browse-everything destination.
export default async function CollectionPage() {
  const products = await getAllProducts();

  return (
    <div className="bg-ivory">
      {/* Breadcrumb + back control */}
      <nav
        aria-label="Breadcrumb"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-6 py-6 sm:py-8"
      >
        <BackButton fallbackHref="/" className="shrink-0" />
        <span aria-hidden="true" className="hidden text-champagne-gold/50 sm:inline">
          |
        </span>
        <ol className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-midnight-navy/50">
          <li>
            <Link
              href="/"
              prefetch
              className="transition-colors duration-300 ease-out hover:text-midnight-navy"
            >
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="text-champagne-gold">
            /
          </li>
          <li aria-current="page" className="text-midnight-navy">
            Our Collection
          </li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mx-auto max-w-3xl px-6 pb-12 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-champagne-gold">
          The Full Range
        </p>
        <h1 className="mt-5 text-4xl text-midnight-navy sm:text-5xl">
          Our Collection
        </h1>
        <p className="mt-5 text-sm leading-7 text-midnight-navy/70 sm:text-base">
          Every OJARA bracelet in one place — natural gemstones, cleansed and
          charged, worn as a daily reminder of your intention.
        </p>
      </header>

      {/* Products */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        {products.length > 0 ? (
          <>
            <p className="mb-8 text-center text-xs uppercase tracking-[0.25em] text-midnight-navy/50">
              {products.length} {products.length === 1 ? "piece" : "pieces"}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-champagne-gold/25 bg-sand/50 px-6 py-20 text-center">
            <p className="font-heading text-2xl text-midnight-navy">
              New pieces are being cleansed and charged.
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-midnight-navy/70">
              The collection is being prepared. Please check back shortly.
            </p>
          </div>
        )}
      </section>

      <ValueProps />
    </div>
  );
}
