import type { Metadata } from "next";
import { getCategories, getProductsByLine } from "@/lib/catalog";
import { parseShopParams, type RawShopParams } from "@/lib/shopFilters";
import { LINES } from "@/lib/lines";
import ShopView from "@/components/shop/ShopView";

const line = LINES.adorn;

export const metadata: Metadata = {
  title: "Stone Jewellery — Necklace & Earring Sets | Adorn",
  description:
    "OJARA Adorn: stone jewellery — sparkling necklace sets with matching earrings, in several colours, for festive days, parties and every day. Free delivery across India, Cash on Delivery.",
  alternates: { canonical: line.href },
  openGraph: {
    title: "Adorn — Stone Jewellery | OJARA",
    description: line.pitch,
    url: line.href,
    type: "website",
  },
};

// The Adorn line: stone jewellery, with piece and occasion pages as pills.
// Before the first Adorn piece is in Wix, ShopView shows the "coming soon"
// state with the email sign-up instead of an empty grid.
export default async function AdornPage({
  searchParams,
}: {
  searchParams: Promise<RawShopParams>;
}) {
  const params = parseShopParams(await searchParams);
  const [products, categories] = await Promise.all([getProductsByLine("adorn"), getCategories()]);

  return (
    <ShopView
      basePath={line.href}
      line="adorn"
      eyebrow={`OJARA ${line.name} · ${line.promise}`}
      title="Stone jewellery"
      intro={line.pitch}
      products={products}
      categories={categories.filter((c) => c.group === "adorn")}
      params={params}
    />
  );
}
