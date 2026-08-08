import { getAllProducts } from "@/lib/catalog";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  COMMERCE_FACTS,
  absoluteUrl,
} from "@/lib/seo";

// ============================================================================
// Google Shopping product feed (RSS 2.0 + the g: namespace).
//
// Merchant Center fetches this daily (see Part B, Step 9). Lessons baked in from
// the sibling build:
//   • g:id is the Wix product _id (wixCatalogItemId), NEVER the SKU — SKUs are
//     shared across colour variants and get deduped/dropped.
//   • Images are extracted defensively and fall back to the brand logo so a
//     product is never rejected for a missing image_link.
//   • Everything is XML-escaped.
//   • g:price uses the list price and g:sale_price the discounted price only when
//     there's a real markdown (never "sale" == "price").
//   • The g:shipping block quotes OJARA's real free-India shipping + handling and
//     transit windows — identical to the Product schema (see COMMERCE_FACTS).
//
// OJARA's catalogue has no per-colour variant system today, so each product emits
// one clean <item>; item_group_id/g:color are intentionally not fabricated.
// ============================================================================

export const revalidate = 3600; // rebuild hourly

const GOOGLE_PRODUCT_CATEGORY =
  "Apparel & Accessories > Jewelry > Bracelets";

// Wix product descriptions arrive as HTML; the catalog strips the tags but leaves
// entities like &nbsp;. Decode the common ones first so the feed doesn't show a
// literal "&amp;nbsp;" after escaping.
const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

const escapeXml = (unsafe: string) =>
  unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// Google wants "1200.00 INR".
const money = (value: number) =>
  `${Number(value).toFixed(2)} ${COMMERCE_FACTS.currency}`;

const absImage = (url: string) =>
  url.startsWith("http") ? url : absoluteUrl(url);

export async function GET() {
  const products = await getAllProducts();

  let kept = 0;
  let skipped = 0;

  const items = products
    .map((p) => {
      // Skip anything that can't form a valid Shopping item.
      const id = p.wixCatalogItemId || p.id;
      if (!id || !p.id || !p.name || !p.price || p.price <= 0) {
        skipped++;
        return "";
      }
      kept++;

      const link = absoluteUrl(`/product/${p.id}`);
      const gallery = (p.images?.length ? p.images : [p.image]).filter(Boolean);
      const mainImage = gallery[0] ? absImage(gallery[0]) : DEFAULT_OG_IMAGE;
      const extraImages = gallery
        .slice(1, 11)
        .map((u) => absImage(u))
        .filter((u) => u !== mainImage);

      const availability = p.stockCount > 0 ? "in_stock" : "out_of_stock";

      // Real markdown → list price in g:price, discounted price in g:sale_price.
      const hasSale =
        typeof p.originalPrice === "number" && p.originalPrice > p.price;
      const priceValue = hasSale ? p.originalPrice! : p.price;
      const salePriceTag = hasSale
        ? `\n      <g:sale_price>${money(p.price)}</g:sale_price>`
        : "";

      const description = escapeXml(
        decodeEntities(p.description || SITE_DESCRIPTION).slice(0, 5000),
      );

      return `    <item>
      <g:id>${escapeXml(id)}</g:id>
      <title>${escapeXml(p.name)}</title>
      <description>${description}</description>
      <link>${escapeXml(link)}</link>
      <g:image_link>${escapeXml(mainImage)}</g:image_link>${extraImages
        .map((u) => `\n      <g:additional_image_link>${escapeXml(u)}</g:additional_image_link>`)
        .join("")}
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${money(priceValue)}</g:price>${salePriceTag}
      <g:brand>${escapeXml(SITE_NAME)}</g:brand>
      <g:google_product_category>${escapeXml(GOOGLE_PRODUCT_CATEGORY)}</g:google_product_category>
      <g:product_type>Gemstone Bracelets</g:product_type>
      <g:identifier_exists>no</g:identifier_exists>
      <g:shipping>
        <g:country>${COMMERCE_FACTS.shippingCountry}</g:country>
        <g:service>Standard</g:service>
        <g:price>${money(COMMERCE_FACTS.shippingCost)}</g:price>
      </g:shipping>
      <g:min_handling_time>${COMMERCE_FACTS.handlingDaysMin}</g:min_handling_time>
      <g:max_handling_time>${COMMERCE_FACTS.handlingDaysMax}</g:max_handling_time>
      <g:min_transit_time>${COMMERCE_FACTS.transitDaysMin}</g:min_transit_time>
      <g:max_transit_time>${COMMERCE_FACTS.transitDaysMax}</g:max_transit_time>
    </item>`;
    })
    .filter(Boolean)
    .join("\n");

  console.log(`feed.xml: ${kept} items emitted, ${skipped} skipped`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // 1-hour edge cache, allow a day of stale-while-revalidate.
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
