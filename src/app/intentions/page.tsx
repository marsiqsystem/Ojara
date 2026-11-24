import type { Metadata } from "next";
import { getCategories, getProductsByLine } from "@/lib/catalog";
import { parseShopParams, type RawShopParams } from "@/lib/shopFilters";
import { BRACELETS_LIVE, INTENTIONS_PIECES, LINES } from "@/lib/lines";
import ShopView from "@/components/shop/ShopView";

const line = LINES.intentions;

export const metadata: Metadata = {
  title: BRACELETS_LIVE ? "Gemstone Bracelets & Rings — Intentions" : "Gemstone Rings — Intentions",
  description:
    `OJARA Intentions: natural gemstone ${INTENTIONS_PIECES} — Black Tourmaline and evil eye for protection, Citrine and Pyrite for abundance, Amethyst for calm. Lab-certified, free delivery on prepaid orders, Cash on Delivery.`,
  alternates: { canonical: line.href },
  openGraph: {
    title: BRACELETS_LIVE ? "Intentions — Gemstone Bracelets & Rings | OJARA" : "Intentions — Gemstone Rings | OJARA",
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
      title={BRACELETS_LIVE ? "Gemstone bracelets & rings" : "Gemstone rings"}
      intro={line.pitch}
      products={products}
      categories={categories.filter((c) => c.slug !== "all-products" && c.group !== "adorn")}
      params={params}
    />
  );
}
