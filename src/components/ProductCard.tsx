import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/mockData";
import { formatPrice } from "@/lib/format";
import AddToCartButton from "@/components/AddToCartButton";

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
  const badge = getDynamicBadge(product.name, categoryName ?? product.intention);
  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl bg-sand shadow-sm transition-all duration-500 md:hover:-translate-y-1 md:hover:shadow-2xl md:hover:shadow-champagne-gold/20 ${className}`}
    >
      <Link
        href={`/product/${product.id}`}
        prefetch
        className="flex flex-1 flex-col"
      >
        <div className="relative aspect-square overflow-hidden sm:aspect-[4/5]">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Intention badge — front and center to the brand story */}
          <span className="absolute left-2 top-2 rounded-full bg-midnight-navy/90 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.15em] text-champagne-gold backdrop-blur-sm sm:left-4 sm:top-4 sm:px-4 sm:py-1.5 sm:text-xs sm:tracking-[0.2em]">
            {badge}
          </span>
          {product.isBundle && (
            <span className="absolute right-2 top-2 rounded-full bg-champagne-gold px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.15em] text-midnight-navy shadow-sm sm:right-4 sm:top-4 sm:px-4 sm:py-1.5 sm:text-xs sm:tracking-[0.2em]">
              Set
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3 pb-0 sm:p-6 sm:pb-0">
          <h3 className="line-clamp-2 text-sm leading-snug text-midnight-navy sm:text-xl sm:leading-normal">
            {product.name}
          </h3>
        </div>
      </Link>

      <div className="p-3 pt-2 sm:p-6 sm:pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-baseline gap-1.5 text-sm text-midnight-navy sm:gap-2 sm:text-lg">
            {formatPrice(product.price)}
            {product.originalPrice && (
              <span className="text-[0.65rem] text-midnight-navy/60 line-through sm:text-sm">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </span>
          {/* Icon-only: the "Add to Bag" label wrapped onto three lines inside the
              round button and read as cheap. The cart glyph matches the header's,
              so the affordance is already familiar. 44px keeps the tap target
              accessible, and ariaLabel carries the name the text used to. */}
          <AddToCartButton
            product={product}
            ariaLabel={`Add ${product.name} to bag`}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-midnight-navy text-midnight-navy transition-colors hover:bg-midnight-navy hover:text-champagne-gold"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="9" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
              <path d="M2.5 3h2l2.2 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 7H6" />
            </svg>
          </AddToCartButton>
        </div>
      </div>
    </article>
  );
}
