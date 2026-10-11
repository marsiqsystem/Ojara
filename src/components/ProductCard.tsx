import type { Product } from "@/lib/mockData";
import ProductCardView from "@/components/ProductCardView";
import { lineOf, pieceTypeInfo, pieceTypeOf, type Occasion } from "@/lib/lines";

// Adorn is shopped by occasion, not intention — its badge says what it's for.
const OCCASION_BADGE: Record<Occasion, string> = {
  festive: "Festive",
  everyday: "Everyday",
  party: "Party Wear",
};

/** The card badge: occasion (or piece) for Adorn, intention for Intentions. */
export const badgeFor = (product: Product, categoryName?: string): string => {
  if (lineOf(product) === "adorn") {
    const occasion = product.occasions?.[0];
    return occasion ? OCCASION_BADGE[occasion] : pieceTypeInfo(pieceTypeOf(product)).plural;
  }
  return getDynamicBadge(product.name, categoryName ?? product.intention);
};

// Badge lookup, most specific phrase first — "evil eye" has to beat the generic
// "protection" rule, and "green aventurine" has to beat "green". Matching is a
// plain lowercase substring test against the product name, so a stone added in
// Wix with no mockData twin still gets a real badge instead of the generic
// default.
const BADGE_KEYWORDS: ReadonlyArray<readonly [readonly string[], string]> = [
  [["evil eye", "nazar", "turkish eye"], "Nazar Protection"],
  [["pcod", "pcos"], "Women's Wellness"],
  [["weight"], "Weight Loss"],
  [["seven chakra", "7 chakra", "chakra"], "Chakra Balance"],
  [["rudraksha", "mala", "tulsi"], "Sacred Tradition"],
  [["black tourmaline", "obsidian", "black onyx", "shungite", "hematite", "protect"], "Shield & Protection"],
  [["rose quartz", "rhodonite", "kunzite", "love"], "Love & Harmony"],
  [["citrine", "pyrite", "wealth", "money", "abundance", "prosper"], "Attract Wealth"],
  [["green aventurine", "jade", "malachite", "luck"], "Luck & Growth"],
  [["tiger eye", "tiger's eye", "tigers eye", "carnelian", "bloodstone", "confidence"], "Courage & Confidence"],
  [["clear quartz", "selenite", "howlite", "clarity", "cleans"], "Clarity & Cleansing"],
  [["moonstone", "pearl", "labradorite", "intuition"], "Intuition & Insight"],
  [["turquoise", "amazonite", "aquamarine", "peace"], "Peace & Truth"],
  [["garnet", "red jasper", "sunstone", "lava", "energy", "vitality"], "Energy & Vitality"],
  [["amethyst", "lepidolite", "calm", "focus", "sleep"], "Calm & Focus"],
];

/**
 * Resolve the badge shown on a product card.
 *
 * Keyword match on the name wins; otherwise fall back to the category the
 * product was found under, and finally to the brand-generic line.
 */
export function getDynamicBadge(
  productName: string,
  categoryName?: string,
): string {
  const name = productName.toLowerCase();

  for (const [keywords, badge] of BADGE_KEYWORDS) {
    if (keywords.some((keyword) => name.includes(keyword))) return badge;
  }

  return categoryName?.trim() || "Wear Your Intention";
}

// Shared by the home collection grid and every /category/[slug] page, so a
// product looks and behaves the same wherever a shopper meets it.
export default function ProductCard({
  product,
  sizes = "(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw",
  className = "",
  categoryName,
}: {
  product: Product;
  sizes?: string;
  // Lets a caller size the card for its container — e.g. a fixed width and
  // snap point when the card sits in a horizontal scroll rail instead of a grid.
  className?: string;
  // Wix collection this card is being listed under, when the caller knows it.
  categoryName?: string;
}) {
  // Curated `intention` stands in as the category fallback when the caller has
  // no collection name, so the six hand-written products keep their own copy
  // rather than being flattened to a keyword guess.
  const badge = badgeFor(product, categoryName);
  // The markup (and, for a design with colours, the swatches) lives in the
  // client view; the badge is worked out here, on the server.
  return <ProductCardView product={product} badge={badge} sizes={sizes} className={className} />;
}
