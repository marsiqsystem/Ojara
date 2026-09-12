import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories } from "@/lib/mockData";
import { getCategories, getCategoryBySlug, getProductsByCategory } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";
import ValueProps from "@/components/ValueProps";
import BackButton from "@/components/BackButton";

// Prerender a static page for every intention and every product type.
export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) return {};

  return {
    title: category.title,
    description: category.tagline,
    alternates: { canonical: `/category/${slug}` },
    openGraph: {
      title: `${category.title} | OJARA`,
      description: category.tagline,
      url: `/category/${slug}`,
      type: "website",
      ...(category.image ? { images: [{ url: category.image, alt: category.title }] } : {}),
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const categoryProducts = await getProductsByCategory(category);

  // Lateral nav — source siblings from the LIVE category list (not mockData), so
  // every chip resolves to a real page. The old mock slugs (e.g. "tourmaline",
  // "protection") don't match the live Wix collection slugs, which is why these
  // chips were 404-ing. On "All Products" there are no true siblings, so this
  // comes back with just the current page and the nav is hidden below.
  const allCategories = await getCategories();
  const siblings = allCategories.filter((c) => c.group === category.group);

  return (
    <div className="bg-ivory">
      {/* Breadcrumb trail + back control */}
      <nav
        aria-label="Breadcrumb"
        className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-6 py-6 sm:py-8"
      >
        <BackButton fallbackHref="/#collection" className="shrink-0" />
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
          <li>
            <Link
              href="/#collection"
              prefetch
              className="transition-colors duration-300 ease-out hover:text-midnight-navy"
            >
              Shop
            </Link>
          </li>
          <li aria-hidden="true" className="text-champagne-gold">
            /
          </li>
          <li aria-current="page" className="text-midnight-navy">
            {category.label}
          </li>
        </ol>
      </nav>

      {/* Category header */}
      <header className="mx-auto max-w-3xl px-6 pb-12 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-champagne-gold">
          {category.group === "intention" ? "Shop by Intention" : "Shop by Stone"}
        </p>
        <h1 className="mt-5 text-4xl text-midnight-navy sm:text-5xl">
          {category.title}
        </h1>
        <p className="mt-5 text-sm leading-7 text-midnight-navy/70 sm:text-base">
          {category.tagline}
        </p>
      </header>

      {/* Sibling categories — keep the shopper moving laterally. Only render when
          there's somewhere else to go (more than just the current page). */}
      {siblings.length > 1 && (
      <nav
        aria-label={
          category.group === "intention"
            ? "Other intentions"
            : "Other collections"
        }
        className="mx-auto max-w-7xl px-6 pb-14"
      >
        <ul className="hide-scrollbar -mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 sm:justify-center">
          {siblings.map((sibling) => {
            const isActive = sibling.slug === category.slug;
            return (
              <li key={sibling.slug} className="snap-start">
                <Link
                  href={`/category/${sibling.slug}`}
                  prefetch
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex whitespace-nowrap rounded-full border px-6 py-3 text-sm tracking-wide transition-all duration-300 ease-out ${
                    isActive
                      ? "border-champagne-gold bg-champagne-gold text-midnight-navy"
                      : "border-champagne-gold/25 bg-sand text-midnight-navy hover:border-champagne-gold hover:bg-champagne-gold/25 hover:shadow-sm"
                  }`}
                >
                  ✦ {sibling.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      )}

      {/* Products */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        {categoryProducts.length > 0 ? (
          <>
            <p className="mb-8 text-center text-xs uppercase tracking-[0.25em] text-midnight-navy/50">
              {categoryProducts.length}{" "}
              {categoryProducts.length === 1 ? "piece" : "pieces"}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {categoryProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  categoryName={category.label}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-champagne-gold/25 bg-sand/50 px-6 py-20 text-center">
            <p className="font-heading text-2xl text-midnight-navy">
              New pieces are being cleansed and charged.
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-midnight-navy/70">
              This collection is being prepared. In the meantime, explore the
              full range of sacred objects.
            </p>
            <Link
              href="/#collection"
              prefetch
              className="mt-8 inline-flex rounded-full bg-champagne-gold px-10 py-4 text-xs font-medium uppercase tracking-[0.25em] text-midnight-navy transition-colors duration-300 ease-out hover:bg-champagne-gold/85"
            >
              View the Collection
            </Link>
          </div>
        )}
      </section>

      {/* Reassurance, reused from the home page */}
      <ValueProps />
    </div>
  );
}
