import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug, getProductById } from "@/lib/catalog";
import { products } from "@/lib/mockData";
import { formatPrice } from "@/lib/format";
import CompleteYourRitual from "@/components/CompleteYourRitual";
import RitualAccordion from "@/components/RitualAccordion";
import ProductReviews from "@/components/ProductReviews";
import ProductFaq from "@/components/ProductFaq";
import YouMayAlsoLike from "@/components/YouMayAlsoLike";
import ProductGallery from "@/components/ProductGallery";
import ShareButton from "@/components/ShareButton";
import JsonLd from "@/components/seo/JsonLd";
import ProductViewTracker from "@/components/analytics/ProductViewTracker";
import { productSchema, breadcrumbSchema } from "@/lib/seo";
import ProductCtas from "@/components/ProductCtas";
import StickyAddToBag from "@/components/StickyAddToBag";
import BackButton from "@/components/BackButton";
import { RAZORPAY_ENABLED } from "@/lib/commerce/config";

// The four objections an Indian shopper brings to a crystal purchase: is the
// stone real, can I pay cash on delivery, has it been energized, and will it sit
// right in my home per Vastu. Answered directly beneath the primary CTA.
const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const trustBadges = [
  {
    label: "Lab Certified Authentic",
    icon: (
      <svg {...iconProps}>
        <path d="M12 3l7 3v5c0 4.4-3 8.2-7 9.5C8 19.2 5 15.4 5 11V6l7-3Z" />
        <path d="m9 11.5 2 2 4-4" />
      </svg>
    ),
  },
  {
    label: "Cash on Delivery (COD)",
    icon: (
      <svg {...iconProps}>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M8 10h5" />
        <path d="M8 13h3.5" />
        <path d="M11 10a2.5 2.5 0 0 1 0 5H8l4 3" />
      </svg>
    ),
  },
  {
    label: "Energized & Cleansed Before Dispatch",
    icon: (
      <svg {...iconProps}>
        <path d="M12 2.5 13.8 8l5.7.2-4.5 3.5 1.6 5.5-4.6-3.2-4.6 3.2 1.6-5.5L4.5 8.2 10.2 8Z" />
      </svg>
    ),
  },
  {
    label: "Vastu Compliant",
    icon: (
      <svg {...iconProps}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V20h13V9.5" />
        <path d="m14 12-1.4 3.6L9 17l3.6 1.4L14 22l1.4-3.6L19 17l-3.6-1.4Z" />
      </svg>
    ),
  },
];

// Prerender a static page for each mock product.
export function generateStaticParams() {
  return products.map((product) => ({ id: product.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) return {};

  const url = `/product/${id}`;
  const images = (product.images?.length ? product.images : [product.image]).map(
    (src) => ({ url: src, alt: product.name }),
  );

  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${product.name} | OJARA`,
      description: product.description,
      url,
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | OJARA`,
      description: product.description,
      images: images.map((i) => i.url),
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  // Breadcrumb up into the category this piece was most likely found through.
  const primaryCategory = await getCategoryBySlug(product.intentions[0]);

  // Structured breadcrumb mirroring the visible trail below (Home / Shop / …).
  const breadcrumbCrumbs = [
    { name: "Home", url: "/" },
    { name: "Shop", url: "/#collection" },
    ...(primaryCategory
      ? [{ name: primaryCategory.label, url: `/category/${primaryCategory.slug}` }]
      : []),
    { name: product.name, url: `/product/${id}` },
  ];

  return (
    <div className="bg-ivory">
      {/* Product structured data for search engines + AI shopping surfaces */}
      <JsonLd id="ld-product" data={productSchema(product)} />
      <JsonLd id="ld-breadcrumb" data={breadcrumbSchema(breadcrumbCrumbs)} />
      {/* Fires the Meta Pixel ViewContent event for this product */}
      <ProductViewTracker product={product} />

      {/* Breadcrumb trail + back control */}
      <nav
        aria-label="Breadcrumb"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-6 py-3 sm:py-4"
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
          <li className="text-midnight-navy/70">
            {primaryCategory ? (
              <Link
                href={`/category/${primaryCategory.slug}`}
                prefetch
                className="transition-colors duration-300 ease-out hover:text-midnight-navy"
              >
                {primaryCategory.label}
              </Link>
            ) : (
              product.intention
            )}
          </li>
          <li aria-hidden="true" className="text-champagne-gold">
            /
          </li>
          <li aria-current="page" className="text-midnight-navy">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Split-screen: sticky image left, scrolling details right */}
      <div className="mx-auto flex max-w-6xl flex-col px-6 pb-24 lg:flex-row lg:items-start lg:gap-16 gap-8">

        {/* LEFT — sticky gallery.
            Mobile: full-bleed escape via left-1/2 -translate-x-1/2 w-screen.
            Desktop: pins to viewport while the right column scrolls past. */}
        <div className="w-full relative left-1/2 -translate-x-1/2 w-screen overflow-hidden lg:left-auto lg:translate-x-0 lg:w-[55%] lg:overflow-visible lg:sticky lg:top-28 lg:self-start lg:h-fit">
          {/* Every image the product actually has (4 per product from Wix), not a
              padded placeholder set. `images` is optional on Product, so mock-mode
              products fall back to their single image. */}
          <ProductGallery
            images={product.images?.length ? product.images : [product.image]}
            productName={product.name}
          />
        </div>

        {/* RIGHT — the tall column that scrolls past the pinned image */}
        <div className="w-full lg:w-[45%] flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-4xl text-midnight-navy sm:text-5xl">
              {product.name}
              {product.isBundle && (
                <span className="ml-3 inline-block rounded-full bg-champagne-gold/20 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-champagne-gold align-middle">
                  ✦ Curated Harmony Set
                </span>
              )}
            </h1>
            <ShareButton productName={product.name} className="mt-1 shrink-0" />
          </div>

          {/* Price highlight — golden price on the normal ivory ground (owner call
              2026-07-17: no navy chip). Extra top margin gives it room to breathe
              below the name instead of sitting glued to it. */}
          <div className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-2 sm:mt-8">
            <span className="text-3xl font-semibold tracking-tight text-champagne-gold sm:text-4xl">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-lg text-midnight-navy/40 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
            {product.originalPrice && (
              <span className="rounded-md bg-emerald-100 px-2.5 py-1.5 text-sm font-bold text-emerald-700">
                Save {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
              </span>
            )}
          </div>

          {/* Prepaid incentive — Viora's green "Extra ₹50 off" strip. Gated behind
              RAZORPAY_ENABLED so it only advertises a payment method checkout can
              actually take. Appears on its own the moment prepaid is switched on. */}
          {RAZORPAY_ENABLED && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <span aria-hidden="true">🎉</span>
              Get Extra ₹50 Off on Prepaid Payments
            </div>
          )}

          {/* Primary action — quantity selector + Add to Cart / Buy Now.
              The Certified Natural / Cleansed & Energized badges that sat here were
              removed (owner call 2026-07-17) — the same reassurance lives in the
              trust-badge grid below the CTA, and the empty space keeps the buy zone
              calm and Viora-like. */}
          <ProductCtas product={product} />

          {/* Risk-reversal trust badges sit directly under the CTA (Viora order),
              then the delivery promise. */}
          <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-midnight-navy/70">
            {trustBadges.map((badge) => (
              <li
                key={badge.label}
                className="inline-flex items-center gap-2 text-[0.7rem] tracking-wide sm:text-xs"
              >
                <span className="flex-shrink-0 text-champagne-gold">
                  {badge.icon}
                </span>
                <span>{badge.label}</span>
              </li>
            ))}
          </ul>

          {/* Delivery promise. Replaces the pincode estimator: it quoted a
              per-pincode ETA we can't actually honour, so we state the real
              dispatch window instead. */}
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-champagne-gold/25 bg-sand/40 px-4 py-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-champagne-gold"
              aria-hidden="true"
            >
              <path d="M10 17h4V5H2v12h3M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
              <circle cx="7.5" cy="17.5" r="2.5" />
              <circle cx="17.5" cy="17.5" r="2.5" />
            </svg>
            <p className="text-sm text-midnight-navy/80">
              Delivery expected in{" "}
              <span className="font-semibold text-midnight-navy">6–7 days</span>{" "}
              &middot; Free shipping &middot; Cash on Delivery
            </p>
          </div>

          {/* The reason to buy, scannable in five seconds. Moved below the buy zone
              so it informs without crowding the price/CTA. */}
          <ul className="mt-8 space-y-3">
            {product.benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-3 text-sm leading-6 text-midnight-navy/85"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex-shrink-0 text-champagne-gold"
                >
                  ✦
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          {/* Intention — reinforces the brand story */}
          <div className="mt-8 rounded-2xl border border-champagne-gold/30 bg-sand/50 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-champagne-gold">
              The Intention
            </p>
            <p className="mt-2 font-heading text-3xl text-midnight-navy">
              {product.intention}
            </p>
            <p className="mt-3 text-sm leading-6 text-midnight-navy/80">
              Charged with purpose and kept close — a daily reminder to{" "}
              {product.intention.toLowerCase()}, every day.
            </p>
          </div>

          {/* Ritual accordions — energy, ritual, promise */}
          <RitualAccordion product={product} />

          {/* Reviews — honest empty state + star/photo submission form */}
          <ProductReviews productId={product.id} productName={product.name} />
        </div>
      </div>

      {/* Mobile-only Viora-style sticky Buy Now bar */}
      <StickyAddToBag product={product} />

      {/* Item-specific FAQ — answers the last objections before checkout */}
      <ProductFaq product={product} />

      {/* Cross-sell rail to keep the shopper browsing */}
      <CompleteYourRitual currentId={product.id} />

      {/* Wider cross-sell at the very bottom of the page */}
      <YouMayAlsoLike currentId={product.id} />
    </div>
  );
}
