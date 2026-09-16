import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllProducts, getCategoryBySlug, getProductById } from "@/lib/catalog";
import { products, hasSpecificIntention } from "@/lib/mockData";
import { formatPrice } from "@/lib/format";
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
import ProductOffers from "@/components/ProductOffers";
import PairItWith from "@/components/PairItWith";
import DeliveryEstimate from "@/components/DeliveryEstimate";
import StickyAddToBag from "@/components/StickyAddToBag";
import BackButton from "@/components/BackButton";
import { whatsappLink, SITE_URL } from "@/lib/commerce/config";
import { FREE_GIFT_WRAP_MINIMUM, GIFT_WRAP_FEE } from "@/lib/commerce/pricing";
import { ritualPairsFor } from "@/lib/commerce/bundle";
import { productSpecs } from "@/lib/productSpecs";

// ============================================================================
// Product page — laid out in the order a shopper decides (the Viora rebuild):
// what it is → rating → why it's real → short description → price & saving →
// offers → buy → when it arrives + why it's safe → gifting / second opinion →
// pieces to add → details → reviews. Every number shown comes from Wix or the
// offer config (lib/commerce/pricing.ts); nothing here is invented.
// ============================================================================

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

// Short, truthful assurances shown as chips under the name. The duplicate grid
// that used to sit under the buttons (the same claims again, plus "Vastu
// Compliant") is gone; the trust row below states store-wide facts instead.
const heroAssurances = [
  {
    label: "Lab-Certified",
    icon: (
      <svg {...iconProps} width={14} height={14}>
        <path d="M12 3l7 3v5c0 4.4-3 8.2-7 9.5C8 19.2 5 15.4 5 11V6l7-3Z" />
        <path d="m9 11.5 2 2 4-4" />
      </svg>
    ),
  },
  {
    label: "Cleansed & Energized",
    icon: (
      <svg {...iconProps} width={14} height={14}>
        <path d="M12 2.5 13.8 8l5.7.2-4.5 3.5 1.6 5.5-4.6-3.2-4.6 3.2 1.6-5.5L4.5 8.2 10.2 8Z" />
      </svg>
    ),
  },
  {
    label: "100% Natural Stone",
    icon: (
      <svg {...iconProps} width={14} height={14}>
        <path d="M6 3h12l3 6-9 12L3 9l3-6Z" />
        <path d="M3 9h18M9 3l3 18M15 3l-3 18" />
      </svg>
    ),
  },
];

// Store-wide promises that hold for every order (see /shipping-returns).
const trustItems = [
  {
    label: "Free delivery",
    sub: "All over India",
    icon: <path d="M10 17h4V5H2v12h3M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1M7.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
  },
  {
    label: "Cash on Delivery",
    sub: "Available",
    icon: <path d="M2 6h20v12H2zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 12h.01M18 12h.01" />,
  },
  {
    label: "48-hr exchange",
    sub: "Easy swap",
    icon: <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 8 5M21 12a9 9 0 0 1-9 9 9 9 0 0 1-8-5M3 4v4h4M21 20v-4h-4" />,
  },
  {
    label: "Secure",
    sub: "Checkout",
    icon: <path d="M12 3l7 3v5c0 4.4-3 8.2-7 9.5C8 19.2 5 15.4 5 11V6l7-3ZM9 11.5l2 2 4-4" />,
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

  // Real markdown from Wix's strikethrough price; 0 when there isn't one.
  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  // "Complete your ritual" — pieces from the same stone / intention family.
  const pairs = ritualPairsFor(product, await getAllProducts());

  // Hidden until the owner sets WHATSAPP_NUMBER (commerce/config.ts).
  const whatsappHref = whatsappLink(
    `Hi OJARA! I'd like to know more about the ${product.name}: ${SITE_URL}/product/${product.id}`,
  );

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
            discountPercent={discountPercent}
          />
        </div>

        {/* RIGHT — the tall column that scrolls past the pinned image */}
        <div className="w-full lg:w-[48%] flex flex-col">
          {/* Eyebrow — what the piece is FOR, when it has a real intention. */}
          {(hasSpecificIntention(product) || product.isBundle) && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
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
          )}

          <h1 className="text-3xl leading-[1.1] text-midnight-navy sm:text-4xl lg:text-5xl">
            {product.name}
          </h1>

          {/* Rating line. No published reviews yet, so it invites the first one
              rather than inventing a score — and jumps to the reviews section. */}
          <a
            href="#reviews"
            className="mt-2 inline-flex items-center gap-2 self-start text-sm text-midnight-navy/60 hover:text-midnight-navy"
          >
            <span className="flex gap-0.5 text-midnight-navy/25" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <svg key={n} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
                </svg>
              ))}
            </span>
            <span className="underline-offset-2 hover:underline">Be the first to review</span>
          </a>

          {/* Why it's real — as chips. */}
          <ul className="mt-3 flex flex-wrap gap-2">
            {heroAssurances.map((a) => (
              <li
                key={a.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-sand/70 px-3 py-1 text-[0.7rem] font-medium tracking-wide text-midnight-navy/80"
              >
                <span className="text-champagne-gold">{a.icon}</span>
                {a.label}
              </li>
            ))}
          </ul>

          {/* Two lines of description up top; the full text is in the accordion. */}
          {product.description && (
            <div className="mt-3 text-sm leading-6 text-midnight-navy/70">
              <p className="line-clamp-2">{product.description}</p>
              <a
                href="#product-description"
                className="font-semibold text-champagne-gold underline-offset-2 hover:underline"
              >
                Read more
              </a>
            </div>
          )}

          {/* Price, the markdown, and the rupee saving. */}
          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-3xl font-semibold tracking-tight text-midnight-navy sm:text-4xl">
                {formatPrice(product.price)}
              </span>
              {discountPercent > 0 && (
                <>
                  <span className="text-lg text-midnight-navy/40 line-through">
                    {formatPrice(product.originalPrice!)}
                  </span>
                  <span className="rounded-md bg-champagne-gold px-2.5 py-1 text-sm font-bold text-midnight-navy">
                    {discountPercent}% OFF
                  </span>
                </>
              )}
            </div>
            {discountPercent > 0 && (
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                You save {formatPrice(product.originalPrice! - product.price)}
              </p>
            )}
          </div>

          {/* Spend ladder (applied automatically in the bag) + pay-online deal. */}
          <ProductOffers price={product.price} productId={product.id} />

          {/* Primary action — quantity selector + Add to Cart / Buy Now. */}
          <ProductCtas product={product} />

          {/* When it arrives, why it's safe, and a human to ask. */}
          <div className="mt-6 rounded-xl border border-champagne-gold/25 bg-sand/30 p-4">
            <div className="flex items-center gap-3">
              <svg {...iconProps} width={20} height={20} className="shrink-0 text-emerald-700">
                <path d="M10 17h4V5H2v12h3M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
                <circle cx="7.5" cy="17.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
              <DeliveryEstimate />
            </div>
            <ul className="mt-3 grid grid-cols-4 gap-1 border-t border-champagne-gold/20 pt-3">
              {trustItems.map((t) => (
                <li key={t.label} className="flex flex-col items-center gap-1 text-center">
                  <svg {...iconProps} width={20} height={20} className="text-champagne-gold">
                    {t.icon}
                  </svg>
                  <span className="text-[0.68rem] font-semibold leading-tight text-midnight-navy">
                    {t.label}
                  </span>
                  <span className="text-[0.62rem] leading-tight text-midnight-navy/55">{t.sub}</span>
                </li>
              ))}
            </ul>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 border-t border-champagne-gold/20 pt-3 text-sm font-medium text-emerald-700 hover:underline"
              >
                Want a closer look? Chat with us on WhatsApp
              </a>
            )}
          </div>

          {/* Gifting cue + a second opinion. Wrap is added in the bag. */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-champagne-gold/30 px-3 py-2.5">
              <svg {...iconProps} width={20} height={20} className="flex-shrink-0 text-champagne-gold">
                <path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8C10.5 5 7 3.5 6.5 6S9 8 12 8zM12 8c1.5-3 5-4.5 5.5-2S15 8 12 8z" />
              </svg>
              <span className="text-xs leading-tight">
                <span className="block font-semibold text-midnight-navy">Gifting it?</span>
                <span className="text-midnight-navy/55">
                  Wrap + note {formatPrice(GIFT_WRAP_FEE)} in your bag · FREE on{" "}
                  {formatPrice(FREE_GIFT_WRAP_MINIMUM)}+
                </span>
              </span>
            </div>
            <ShareButton productName={product.name} />
          </div>

          {/* Pieces to add, right where the decision is made. */}
          <PairItWith items={pairs} />

          {/* Product details — only what this piece's own description states
              (see lib/productSpecs.ts), plus the natural-variation note the FAQ
              already makes. */}
          <div className="mt-8">
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

          {/* The reason to buy, scannable in five seconds. */}
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

          {/* Ritual accordions — description, ritual, shipping */}
          <RitualAccordion product={product} />

          {/* Reviews — honest empty state + star/photo submission form */}
          <ProductReviews productId={product.id} productName={product.name} />
        </div>
      </div>

      {/* Sticky Buy Now bar (phones + tablets) */}
      <StickyAddToBag product={product} />

      {/* Item-specific FAQ — answers the last objections before checkout */}
      <ProductFaq product={product} />

      {/* Wider cross-sell at the very bottom of the page */}
      <YouMayAlsoLike product={product} />
    </div>
  );
}
