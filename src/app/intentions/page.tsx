import type { Metadata } from "next";
import { getCategories, getProductsByLine } from "@/lib/catalog";
import { parseShopParams, type RawShopParams } from "@/lib/shopFilters";
import { LINES } from "@/lib/lines";
import ShopView from "@/components/shop/ShopView";

const line = LINES.intentions;

export const metadata: Metadata = {
  title: "Gemstone Bracelets & Rings — Intentions",
  description:
    "OJARA Intentions: natural gemstone bracelets and rings — Black Tourmaline and evil eye for protection, Citrine and Pyrite for abundance, Amethyst for calm. Lab-certified, free delivery, Cash on Delivery.",
  alternates: { canonical: line.href },
  openGraph: {
    title: "Intentions — Gemstone Bracelets & Rings | OJARA",
    description: line.pitch,
    url: line.href,
    type: "website",
  },
};

// The Intentions line: every gemstone bracelet and ring, with the intention
// collections as pills.
export default async function IntentionsPage({
  searchParams,
}: {
  searchParams: Promise<RawShopParams>;
}) {
  const params = parseShopParams(await searchParams);
  const [products, categories] = await Promise.all([getProductsByLine("intentions"), getCategories()]);

  return (
    <ShopView
      basePath={line.href}
      line="intentions"
      eyebrow={`OJARA ${line.name} · ${line.promise}`}
      title="Gemstone bracelets & rings"
      intro={line.pitch}
      products={products}
      categories={categories.filter((c) => c.slug !== "all-products" && c.group !== "adorn")}
      params={params}
    />
  );
}
