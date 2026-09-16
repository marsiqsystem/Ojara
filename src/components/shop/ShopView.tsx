import Image from "next/image";
import Link from "next/link";
import type { Category, Product } from "@/lib/mockData";
import { formatPrice } from "@/lib/format";
import { applyShopParams, shopHref, type ShopParams } from "@/lib/shopFilters";
import ProductCard from "@/components/ProductCard";
import BackButton from "@/components/BackButton";
import BrandTags from "@/components/BrandTags";
import SortSelect from "./SortSelect";
import OfferLadderTile from "./OfferLadderTile";

/**
 * The shop page, shared by /collection and /category/[slug] (the Viora ShopView).
 * Short header so the first pieces arrive fast; category pills with a real photo;
 * a sticky sort + price + type bar; the spend-ladder tile inside the grid; sold
 * out last; and an empty state that always offers a way back.
 */
export default function ShopView({
  basePath,
  eyebrow,
  title,
  intro,
  products,
  categories,
  activeSlug,
  params,
  categoryName,
}: {
  basePath: string;
  eyebrow: string;
  title: string;
  intro: string;
  products: Product[];
  categories: Category[];
  /** Slug of the current category, or undefined on /collection. */
  activeSlug?: string;
  params: ShopParams;
  /** Passed to cards so their badge can fall back to the collection name. */
  categoryName?: string;
}) {
  const result = applyShopParams(products, params);
  const filtered = !!(params.price || params.type);
  const count = result.items.length;
  const inStock = result.items.filter((p) => p.stockCount > 0).length;
  const showLadder = inStock >= 6;
  const clear = shopHref(basePath, { sort: params.sort });

  const chipClass = (active: boolean) =>
    `flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-[0.8rem] font-semibold transition-colors ${
      active
        ? "border-midnight-navy bg-midnight-navy text-champagne-gold"
        : "border-midnight-navy/20 bg-white text-midnight-navy hover:border-champagne-gold"
    }`;

  return (
    <div className="bg-ivory">
      {/* Header — kept short so the first pieces arrive on the first phone screen */}
      <section className="mx-auto max-w-7xl px-6 pt-4 sm:pt-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs uppercase tracking-[0.2em] text-midnight-navy/50">
          <BackButton fallbackHref="/" className="shrink-0" />
          <span aria-hidden="true" className="text-champagne-gold/50">|</span>
          <Link href="/" className="hover:text-midnight-navy">Home</Link>
          <span aria-hidden="true" className="text-champagne-gold">/</span>
          {activeSlug ? (
            <>
              <Link href="/collection" className="hover:text-midnight-navy">Shop</Link>
              <span aria-hidden="true" className="text-champagne-gold">/</span>
              <span aria-current="page" className="text-midnight-navy">{title}</span>
            </>
          ) : (
            <span aria-current="page" className="text-midnight-navy">Shop</span>
          )}
        </nav>
        <p className="mt-4 text-[0.68rem] uppercase tracking-[0.3em] text-champagne-gold">{eyebrow}</p>
        <h1 className="mt-1 text-3xl leading-tight text-midnight-navy sm:text-4xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-midnight-navy/70">
          {intro}
          {result.total > 0 && (
            <span className="whitespace-nowrap font-medium text-midnight-navy">
              {" "}· {result.total} {result.total === 1 ? "piece" : "pieces"} from {formatPrice(result.fromPrice)}
            </span>
          )}
        </p>
      </section>

      {/* Categories — swipeable pills with a real product photo */}
      {categories.length > 0 && (
        <nav aria-label="Categories" className="mt-4">
          <ul className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-6 pb-1 hide-scrollbar">
            <li className="shrink-0">
              <Link href="/collection" aria-current={!activeSlug ? "page" : undefined} className={`${chipClass(!activeSlug)} h-10 px-4`}>
                All
              </Link>
            </li>
            {categories.map((c) => {
              const active = c.slug === activeSlug;
              return (
                <li key={c.slug} className="shrink-0">
                  <Link
                    href={`/category/${c.slug}`}
                    aria-current={active ? "page" : undefined}
                    className={`${chipClass(active)} h-10 gap-2 pl-1 pr-3.5`}
                  >
                    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-sand">
                      {c.image && <Image src={c.image} alt="" fill sizes="32px" className="object-cover" />}
                    </span>
                    {c.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* Sort + price + type — sticks under the header while browsing */}
      {result.total > 0 && (
        <div className="sticky top-[79px] z-30 mt-3 border-y border-champagne-gold/20 bg-ivory/95 backdrop-blur lg:top-[81px]">
          <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-6 py-2 hide-scrollbar">
            <SortSelect basePath={basePath} params={params} />
            <span className="h-5 w-px shrink-0 bg-midnight-navy/15" aria-hidden="true" />
            {result.typeChips.map((chip) => (
              <Link
                key={chip.key}
                href={shopHref(basePath, { ...params, type: chip.active ? undefined : chip.key })}
                scroll={false}
                aria-pressed={chip.active}
                className={chipClass(chip.active)}
              >
                {chip.label}
                {chip.active ? <span aria-hidden="true">✕</span> : <span className="font-normal text-midnight-navy/50">({chip.count})</span>}
              </Link>
            ))}
            {result.typeChips.length > 0 && <span className="h-5 w-px shrink-0 bg-midnight-navy/15" aria-hidden="true" />}
            {result.priceChips.map((chip) => (
              <Link
                key={chip.key}
                href={shopHref(basePath, { ...params, price: chip.active ? undefined : chip.key })}
                scroll={false}
                aria-pressed={chip.active}
                className={chipClass(chip.active)}
              >
                {chip.label}
                {chip.active ? <span aria-hidden="true">✕</span> : <span className="font-normal text-midnight-navy/50">({chip.count})</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-4 sm:pt-6">
        {filtered && count > 0 && (
          <p className="mb-3 text-xs text-midnight-navy/60">
            Showing {count} of {result.total} pieces ·{" "}
            <Link href={clear} scroll={false} className="font-semibold text-champagne-gold">
              Clear filters
            </Link>
          </p>
        )}

        {count > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {result.items.map((product, index) => (
              <GridItem key={product.id} index={index} showLadder={showLadder}>
                <ProductCard product={product} categoryName={categoryName} className="h-full" />
              </GridItem>
            ))}
          </ul>
        ) : result.total > 0 ? (
          <div className="rounded-2xl border border-champagne-gold/25 bg-sand/50 px-6 py-12 text-center">
            <p className="font-heading text-2xl text-midnight-navy">Nothing matches these filters here</p>
            <p className="mt-2 text-sm text-midnight-navy/65">
              {result.total} other {result.total === 1 ? "piece is" : "pieces are"} waiting.
            </p>
            <Link
              href={clear}
              scroll={false}
              className="mt-6 inline-flex rounded-full bg-midnight-navy px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] text-champagne-gold"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-champagne-gold/25 bg-sand/50 px-6 py-16 text-center">
            <p className="font-heading text-2xl text-midnight-navy">New pieces are being cleansed and charged.</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-midnight-navy/70">
              This collection is being prepared. In the meantime, explore everything else.
            </p>
            <Link
              href="/collection"
              className="mt-6 inline-flex rounded-full bg-champagne-gold px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] text-midnight-navy"
            >
              Shop all pieces
            </Link>
          </div>
        )}
      </section>

      <BrandTags />
    </div>
  );
}

/**
 * The ladder row goes after a complete grid row: after 4 cards on phones (2 rows)
 * and desktop (1 row), after 6 on tablets (2 rows of 3).
 */
function GridItem({
  index,
  showLadder,
  children,
}: {
  index: number;
  showLadder: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <li>{children}</li>
      {showLadder && index === 3 && (
        <li className="col-span-2 md:hidden lg:col-span-4 lg:block">
          <OfferLadderTile />
        </li>
      )}
      {showLadder && index === 5 && (
        <li className="hidden md:col-span-3 md:block lg:hidden">
          <OfferLadderTile />
        </li>
      )}
    </>
  );
}
