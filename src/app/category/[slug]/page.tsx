import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories, getCategoryBySlug, getProductsByCategory } from "@/lib/catalog";
import { parseShopParams, type RawShopParams } from "@/lib/shopFilters";
import { LINES } from "@/lib/lines";
import ShopView from "@/components/shop/ShopView";

// Rendered per request, NOT prerendered: the page reads ?sort / ?price /
// ?type (searchParams), and a statically generated page that reads them fails
// with DYNAMIC_SERVER_USAGE — every /category page returned 500 on Vercel.
// The catalogue itself stays cached (catalog.ts, 5 minutes).

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
  searchParams: Promise<RawShopParams>;
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

  // Each category belongs to one line; its pills stay within that line.
  const line = category.group === "adorn" ? LINES.adorn : LINES.intentions;
  const sameLine = (group: string) => (group === "adorn") === (line.key === "adorn");

  return (
    <ShopView
      basePath={`/category/${slug}`}
      line={line.key}
      crumbs={[{ label: line.name, href: line.href }]}
      eyebrow={
        line.key === "adorn"
          ? `OJARA Adorn · ${category.occasion ? "Shop by occasion" : "Stone jewellery"}`
          : category.group === "intention"
            ? "OJARA Intentions · Shop by intention"
            : "OJARA Intentions · Shop by stone"
      }
      title={category.label}
      intro={category.tagline}
      products={products}
      categories={allCategories.filter((c) => c.slug !== "all-products" && sameLine(c.group))}
      activeSlug={category.slug}
      params={parseShopParams(await searchParams)}
      // Adorn cards badge by occasion; only Intentions falls back to the page name.
      categoryName={line.key === "adorn" ? undefined : category.label}
    />
  );
}
