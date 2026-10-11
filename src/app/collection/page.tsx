import type { Metadata } from "next";
import { getAllProducts, getCategories } from "@/lib/catalog";
import { parseShopParams, type RawShopParams } from "@/lib/shopFilters";
import ShopView from "@/components/shop/ShopView";

export const metadata: Metadata = {
  title: "Shop All Jewellery",
  description:
    "Every OJARA piece in one place — natural gemstone bracelets and rings, and stone jewellery: necklace sets with matching earrings. Free delivery across India, Cash on Delivery.",
  alternates: { canonical: "/collection" },
  openGraph: {
    title: "Shop All | OJARA",
    description:
      "Natural gemstone bracelets and rings, and stone jewellery — necklace sets with matching earrings.",
    url: "/collection",
    type: "website",
  },
};

// The full catalogue, both lines — the browse-everything destination (header
// "Shop", bottom nav, the home page's "Shop by budget" tiles). Sort, line, type
// and price live in the URL, handled by the shared ShopView.
export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<RawShopParams>;
}) {
  const params = parseShopParams(await searchParams);
  const [products, categories] = await Promise.all([getAllProducts(), getCategories()]);

  return (
    <ShopView
      basePath="/collection"
      eyebrow="The full range"
      title="Shop all"
      intro="Gemstone bracelets and rings, and stone jewellery for every occasion."
      products={products}
      // "All Products" is the same list as this page — the "All" pill covers it.
      categories={categories.filter((c) => c.slug !== "all-products")}
      params={params}
    />
  );
}
