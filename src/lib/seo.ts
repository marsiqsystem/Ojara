import { SITE_URL, BRAND_NAME, SUPPORT_EMAIL } from "@/lib/commerce/config";
import type { Product } from "@/lib/mockData";

// Central SEO constants + JSON-LD builders. SITE_URL already resolves to the live
// domain (https://www.ojara.co.in) in production — see commerce/config.ts.
export { SITE_URL };

export const SITE_NAME = BRAND_NAME; // "OJARA"

export const SITE_DESCRIPTION =
  "OJARA makes bracelets of natural gemstones — Black Tourmaline and evil eye for protection, Citrine for abundance, Carnelian for courage, Lapis Lazuli for clarity. Each piece is cleansed and charged before it reaches you.";

// OJARA's real social profiles. Add a Facebook/Pinterest URL here once confirmed —
// sameAs feeds Google's entity graph and AI answer engines.
export const SOCIAL_PROFILES = ["https://www.instagram.com/ojara.india"];

// ─────────────────────────────────────────────────────────────────────────────
// OJARA's REAL commerce facts, sourced from /shipping-returns. Kept here so the
// Product schema and the Google Shopping feed (feed.xml) quote identical policy —
// a mismatch between the two is a common Merchant Center disapproval.
// ─────────────────────────────────────────────────────────────────────────────
export const COMMERCE_FACTS = {
  currency: "INR",
  shippingCountry: "IN",
  // Free shipping on every order, no minimum spend.
  shippingCost: 0,
  // Dispatch (owner, 2026-09-17): orders placed before 8 pm IST are packed and
  // shipped the same day; after 8 pm, the next working day. Monday–Saturday —
  // closed Sundays. So handling is 0–1 working days, then 3–7 business days in
  // transit. lib/deliveryEstimate.ts turns these into real dates.
  handlingDaysMin: 0,
  handlingDaysMax: 1,
  dispatchCutoffHourIST: 20,
  transitDaysMin: 3,
  transitDaysMax: 7,
  // No refunds; exchange only, within 48 hours of delivery (2 calendar days).
  returnWindowDays: 2,
} as const;

/** Absolute URL helper — joins a path onto SITE_URL with no double slashes. */
export const absoluteUrl = (path = "/") =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Default social share image (falls back to the brand mark). */
export const DEFAULT_OG_IMAGE = absoluteUrl("/logo.png");

// Ensure a product image is an absolute URL (Wix images already are; local
// /images/* paths need the origin prepended for Open Graph + JSON-LD).
const toAbsolute = (url: string) =>
  url.startsWith("http") ? url : absoluteUrl(url);

// Stable @id anchors so the Organization can be referenced (by @id) from Product
// and Article schema instead of being duplicated on every page.
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** Organization node (for the root @graph). */
export const organizationNode = () => ({
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: absoluteUrl("/logo.png"),
  },
  image: absoluteUrl("/logo.png"),
  description: SITE_DESCRIPTION,
  email: SUPPORT_EMAIL,
  sameAs: SOCIAL_PROFILES,
});

/** WebSite node (enables the sitelinks search box in Google). */
export const websiteNode = () => ({
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  name: SITE_NAME,
  url: SITE_URL,
  publisher: { "@id": ORG_ID },
});

/**
 * Site-wide structured data as a single @graph — one <script> in the root layout
 * carrying both the Organization and WebSite entities, cross-linked by @id. A
 * single graph (vs. two loose scripts) is what Google's docs recommend and lets
 * every other page's schema reference the Organization without repeating it.
 */
export const siteGraph = () => ({
  "@context": "https://schema.org",
  "@graph": [organizationNode(), websiteNode()],
});

// Kept for backwards-compatibility with any importer; the layout now uses siteGraph().
export const organizationSchema = () => ({
  "@context": "https://schema.org",
  ...organizationNode(),
});
export const websiteSchema = () => ({
  "@context": "https://schema.org",
  ...websiteNode(),
});

/**
 * Shipping details node reflecting OJARA's real policy: free shipping across
 * India, 1–3 day handling + 3–7 day transit.
 */
const shippingDetails = () => ({
  "@type": "OfferShippingDetails",
  shippingRate: {
    "@type": "MonetaryAmount",
    value: COMMERCE_FACTS.shippingCost,
    currency: COMMERCE_FACTS.currency,
  },
  shippingDestination: {
    "@type": "DefinedRegion",
    addressCountry: COMMERCE_FACTS.shippingCountry,
  },
  deliveryTime: {
    "@type": "ShippingDeliveryTime",
    handlingTime: {
      "@type": "QuantitativeValue",
      minValue: COMMERCE_FACTS.handlingDaysMin,
      maxValue: COMMERCE_FACTS.handlingDaysMax,
      unitCode: "DAY",
    },
    transitTime: {
      "@type": "QuantitativeValue",
      minValue: COMMERCE_FACTS.transitDaysMin,
      maxValue: COMMERCE_FACTS.transitDaysMax,
      unitCode: "DAY",
    },
  },
});

/**
 * Return policy node. OJARA does NOT refund — it offers a 48-hour exchange — so
 * this honestly encodes a 2-day finite window with an exchange (not money-back)
 * refund type. Nothing here claims a refund the brand doesn't give.
 */
const returnPolicy = () => ({
  "@type": "MerchantReturnPolicy",
  applicableCountry: COMMERCE_FACTS.shippingCountry,
  returnPolicyCategory:
    "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: COMMERCE_FACTS.returnWindowDays,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/FreeReturn",
  refundType: "https://schema.org/ExchangeRefund",
});

/** Product schema for a product detail page. */
export const productSchema = (product: Product) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: product.name,
  description: product.description,
  image: (product.images?.length ? product.images : [product.image]).map(toAbsolute),
  brand: { "@type": "Brand", name: SITE_NAME },
  // No SKU/variant colour system on OJARA's catalogue today; the product id (slug)
  // is the stable identifier search engines can key on.
  sku: product.wixCatalogItemId || product.id,
  offers: {
    "@type": "Offer",
    url: absoluteUrl(`/product/${product.id}`),
    priceCurrency: COMMERCE_FACTS.currency,
    price: String(product.price),
    availability:
      product.stockCount > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@id": ORG_ID },
    shippingDetails: shippingDetails(),
    hasMerchantReturnPolicy: returnPolicy(),
  },
  // aggregateRating / review are intentionally omitted — OJARA has no verified
  // reviews yet, and fabricating them risks a Google structured-data penalty. Add
  // them here only when real, first-party reviews exist.
});

type Crumb = { name: string; url: string };

/** BreadcrumbList schema. Pass absolute or root-relative URLs. */
export const breadcrumbSchema = (crumbs: Crumb[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: toAbsolute(c.url),
  })),
});

type Faq = { question: string; answer: string };

/** FAQPage schema — attach to the page that actually renders these Q&As. */
export const faqSchema = (faqs: Faq[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
});

type BlogPostInput = {
  title: string;
  description: string;
  slug: string;
  date: string; // ISO
  updated?: string; // ISO
  image?: string;
};

/** BlogPosting schema for a journal article. */
export const blogPostingSchema = (post: BlogPostInput) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: post.title,
  description: post.description,
  image: post.image ? toAbsolute(post.image) : DEFAULT_OG_IMAGE,
  datePublished: post.date,
  dateModified: post.updated || post.date,
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": absoluteUrl(`/journal/${post.slug}`),
  },
  author: { "@id": ORG_ID },
  publisher: { "@id": ORG_ID },
});
