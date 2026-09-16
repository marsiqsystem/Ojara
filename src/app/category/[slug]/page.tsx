import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categories } from "@/lib/mockData";
import { getCategories, getCategoryBySlug, getProductsByCategory } from "@/lib/catalog";
import { parseShopParams } from "@/lib/shopFilters";
import ShopView from "@/components/shop/ShopView";

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

// One collection, in the shared shop layout. The pills come from the LIVE
// category list (not mockData), so every pill resolves to a real page.
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; price?: string; type?: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const [products, allCategories] = await Promise.all([
    getProductsByCategory(category),
    getCategories(),
  ]);

  return (
    <ShopView
      basePath={`/category/${slug}`}
      eyebrow={category.group === "intention" ? "Shop by intention" : "Shop by stone"}
      title={category.label}
      intro={category.tagline}
      products={products}
      categories={allCategories.filter((c) => c.slug !== "all-products")}
      activeSlug={category.slug}
      params={parseShopParams(await searchParams)}
      categoryName={category.label}
    />
  );
}
