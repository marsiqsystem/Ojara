import type { Metadata } from "next";
import { getAllProducts, getCategories } from "@/lib/catalog";
import { parseShopParams } from "@/lib/shopFilters";
import ShopView from "@/components/shop/ShopView";

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

// The full catalogue — the browse-everything destination (header "Shop", bottom
// nav, the home page's "Shop by budget" tiles). Sort, price and type live in the
// URL (?sort=&price=&type=), handled by the shared ShopView.
export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; price?: string; type?: string }>;
}) {
  const params = parseShopParams(await searchParams);
  const [products, categories] = await Promise.all([getAllProducts(), getCategories()]);

  return (
    <ShopView
      basePath="/collection"
      eyebrow="The full range"
      title="Shop all"
      intro="Natural gemstone bracelets and rings, cleansed before they reach you."
      products={products}
      // "All Products" is the same list as this page — the "All" pill covers it.
      categories={categories.filter((c) => c.slug !== "all-products")}
      params={params}
    />
  );
}
