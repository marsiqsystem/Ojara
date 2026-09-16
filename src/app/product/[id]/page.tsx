import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug, getProductById } from "@/lib/catalog";
import { products, hasSpecificIntention } from "@/lib/mockData";
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
import { productSpecs } from "@/lib/productSpecs";

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

// Short, truthful assurances shown high in the hero, in the slot the reference
// PDPs fill with a star rating. OJARA has no published reviews yet and won't
// invent a number (see ProductReviews) — so this states real guarantees the
// brand already makes on every piece.
const heroAssurances = [
  {
    label: "Lab-Certified",
    icon: (
      <svg {...iconProps} width={16} height={16}>
        <path d="M12 3l7 3v5c0 4.4-3 8.2-7 9.5C8 19.2 5 15.4 5 11V6l7-3Z" />
        <path d="m9 11.5 2 2 4-4" />
      </svg>
    ),
  },
  {
    label: "Cleansed & Energized",
    icon: (
      <svg {...iconProps} width={16} height={16}>
        <path d="M12 2.5 13.8 8l5.7.2-4.5 3.5 1.6 5.5-4.6-3.2-4.6 3.2 1.6-5.5L4.5 8.2 10.2 8Z" />
      </svg>
    ),
  },
  {
    label: "100% Natural Stone",
    icon: (
      <svg {...iconProps} width={16} height={16}>
        <path d="M6 3h12l3 6-9 12L3 9l3-6Z" />
        <path d="M3 9h18M9 3l3 18M15 3l-3 18" />
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

      {/* Breadcrumb trail + back control. Widened in step with the hero row below
          (max-w-7xl on desktop) so the trail keeps aligning with the gallery. */}
      <nav
        aria-label="Breadcrumb"
        className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-6 py-3 sm:py-4"
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
          {/* Category crumb only when there's a real one. Products without a
              curated twin used to show "Wear Your Intention" here — a tagline
              posing as a category, linking nowhere. */}
          {(primaryCategory || hasSpecificIntention(product)) && (
            <>
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
            </>
          )}
          <li aria-hidden="true" className="text-champagne-gold">
            /
          </li>
          <li aria-current="page" className="text-midnight-navy">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Split-screen: sticky image left, scrolling details right. On desktop the
          row is widened (max-w-7xl) and the gap opened up so the image shifts into
          the empty left gutter and the buy column on the right has room to breathe
          (owner call 2026-09-12, desktop only — mobile is unchanged). */}
      <div className="mx-auto flex max-w-7xl flex-col px-6 pb-24 lg:flex-row lg:items-start lg:gap-20 gap-8">

        {/* LEFT — sticky gallery.
            Below lg: full-bleed by cancelling the row's px-6 (-mx-6). This used to
            be left-1/2 + w-screen, but 100vw includes a desktop scrollbar, so
            browsers 768–1023px wide scrolled sideways by the scrollbar's width.
            Desktop: pins to viewport while the right column scrolls past. */}
        <div className="relative -mx-6 overflow-hidden lg:mx-0 lg:w-[52%] lg:overflow-visible lg:sticky lg:top-28 lg:self-start lg:h-fit">
          {/* Every image the product actually has (4 per product from Wix), not a
              padded placeholder set. `images` is optional on Product, so mock-mode
              products fall back to their single image. */}
          <ProductGallery
            images={product.images?.length ? product.images : [product.image]}
            productName={product.name}
          />
        </div>

        {/* RIGHT — the tall column that scrolls past the pinned image */}
        <div className="w-full lg:w-[48%] flex flex-col">
          {/* Eyebrow row — the intention as a badge (the reference PDPs lead with
              a "Best Seller" pill; ours leads with what the piece is FOR) plus the
              share control. */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {hasSpecificIntention(product) && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-champagne-gold/15 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-champagne-gold">
                  ✦ {product.intention}
                </span>
              )}
              {product.isBundle && (
                <span className="inline-block rounded-full border border-champagne-gold/40 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-champagne-gold">
                  Curated Harmony Set
                </span>
              )}
            </div>
            <ShareButton productName={product.name} className="mt-0.5 shrink-0" />
          </div>

          <h1 className="mt-4 text-4xl leading-[1.1] text-midnight-navy sm:text-5xl">
            {product.name}
          </h1>

          {/* Assurance row — truthful guarantees in the slot the references give a
              star rating. See heroAssurances (no reviews yet, no invented number). */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {heroAssurances.map((a) => (
              <span
                key={a.label}
                className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium tracking-wide text-midnight-navy/70 sm:text-xs"
              >
                <span className="text-champagne-gold">{a.icon}</span>
                {a.label}
              </span>
            ))}
          </div>

          {/* Price highlight — golden price on the normal ivory ground (owner call
              2026-07-17: no navy chip). Now shows the rupee saving alongside the %,
              the way the reference PDPs frame the discount ("You Save ₹X (Y%)"). */}
          <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-2 sm:mt-7">
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
                Save {formatPrice(product.originalPrice - product.price)} (
                {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%)
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

          {/* Product details — only what this piece's own description states
              (see lib/productSpecs.ts), plus the natural-variation note the FAQ
              already makes. Competitor PDPs lead with this; ours had none. */}
          <div className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-champagne-gold">
              Product details
            </h2>
            <dl className="mt-3 divide-y divide-champagne-gold/20 border-y border-champagne-gold/20">
              {productSpecs(product).map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-6 py-2.5 text-sm">
                  <dt className="text-midnight-navy/60">{row.label}</dt>
                  <dd className="text-right font-medium text-midnight-navy">{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs leading-5 text-midnight-navy/60">
              Each stone is natural, so colour, pattern and inclusions vary slightly from
              piece to piece.
            </p>
          </div>

          {/* The reason to buy, scannable in five seconds — titled and set on
              check marks, the "Why [product]?" block the reference PDPs use. Moved
              below the buy zone so it informs without crowding the price/CTA. */}
          {product.benefits.length > 0 && (
            <div className="mt-8 rounded-2xl border border-champagne-gold/25 bg-sand/25 p-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-champagne-gold">
                Why this piece
              </h2>
              <ul className="mt-4 space-y-3">
                {product.benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-3 text-sm leading-6 text-midnight-navy/85"
                  >
                    <svg
                      {...iconProps}
                      width={17}
                      height={17}
                      className="mt-0.5 flex-shrink-0 text-champagne-gold"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="m8.5 12 2.3 2.3L15.5 9.5" />
                    </svg>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Intention — reinforces the brand story. Only for pieces with a real
              intention; for the rest it read "Wear Your Intention… a daily
              reminder to wear your intention", filler on 22 of 27 products. */}
          {hasSpecificIntention(product) && (
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
          )}

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
      <CompleteYourRitual product={product} />

      {/* Wider cross-sell at the very bottom of the page */}
      <YouMayAlsoLike product={product} />
    </div>
  );
}
