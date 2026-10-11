import Image from "next/image";
import Link from "next/link";
import type { Category, Product } from "@/lib/mockData";
import { formatPrice } from "@/lib/format";
import { applyShopParams, shopHref, type ShopParams } from "@/lib/shopFilters";
import { LINES, type Line } from "@/lib/lines";
import ProductCard from "@/components/ProductCard";
import BackButton from "@/components/BackButton";
import BrandTags from "@/components/BrandTags";
import Newsletter from "@/components/Newsletter";
import SortSelect from "./SortSelect";
import OffersTile from "./OffersTile";
import OfferCarousel from "@/components/media/OfferCarousel";
import ShoppableReels from "@/components/media/ShoppableReels";
import { reelsForTags, type Reel } from "@/lib/media";

/** Reel topics for a category page, read off its slug (wealth-success → wealth). */
const reelTagsFor = (slug?: string): Reel["tags"] => {
  const s = slug ?? "";
  if (s.includes("wealth")) return ["wealth"];
  if (s.includes("calm")) return ["calm"];
  if (s.includes("protection")) return ["protection"];
  if (s.includes("love")) return ["love"];
  return ["wealth", "trust", "unboxing"];
};

/** Which line a category page belongs to. */
const lineOfCategory = (c: Category): Line => (c.group === "adorn" ? "adorn" : "intentions");

/**
 * The shop page, shared by /collection, /intentions, /adorn and
 * /category/[slug] (the Viora ShopView). Short header so the first pieces
 * arrive fast; category pills with a real photo, grouped by line; a sticky
 * sort + line + type + price bar; the offer artwork above the grid on desktop
 * and the running-offers tile inside it; sold out last; an empty state that
 * always offers a way back; then reels, one tap from the bag.
 *
 * `line` scopes the page to one line: Adorn pages drop the bracelet-offer
 * artwork and the gemstone certificate, which aren't true of stone jewellery.
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
  line,
  crumbs = [],
}: {
  basePath: string;
  eyebrow: string;
  title: string;
  intro: string;
  products: Product[];
  categories: Category[];
  /** Slug of the current category, or undefined on a line / all page. */
  activeSlug?: string;
  params: ShopParams;
  /** Passed to cards so their badge can fall back to the collection name. */
  categoryName?: string;
  /** The line this page belongs to; undefined on /collection (both lines). */
  line?: Line;
  /** Crumbs between "Shop" and this page (e.g. the line on a category page). */
  crumbs?: { label: string; href: string }[];
}) {
  const result = applyShopParams(products, params);
  const filtered = !!(params.price || params.type || params.line);
  const count = result.items.length;
  const inStock = result.items.filter((p) => p.stockCount > 0).length;
  // The offers tile and artwork sell bracelet offers — Intentions pages only.
  const showOffers = line !== "adorn";
  const showLadder = showOffers && inStock >= 6;
  const clear = shopHref(basePath, { sort: params.sort });
  const allHref = line ? LINES[line].href : "/collection";

  // Pills: this line's categories; on /collection both, each under its name.
  const pillGroups = (line ? [line] : (["intentions", "adorn"] as Line[]))
    .map((l) => ({ line: l, items: categories.filter((c) => lineOfCategory(c) === l) }))
    .filter((g) => g.items.length > 0);
  const showGroupLabels = pillGroups.length > 1;

  const chipClass = (active: boolean) =>
    `flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-[0.8rem] font-semibold transition-colors ${
      active
        ? "border-midnight-navy bg-midnight-navy text-champagne-gold"
        : "border-midnight-navy/20 bg-white text-midnight-navy hover:border-champagne-gold"
    }`;

  const chips = <K extends string>(
    list: { key: K; label: string; count: number; active: boolean }[],
    hrefFor: (key: K | undefined) => string,
  ) =>
    list.map((chip) => (
      <Link
        key={chip.key}
        href={hrefFor(chip.active ? undefined : chip.key)}
        scroll={false}
        aria-pressed={chip.active}
        className={chipClass(chip.active)}
      >
        {chip.label}
        {chip.active ? <span aria-hidden="true">✕</span> : <span className="font-normal text-midnight-navy/50">({chip.count})</span>}
      </Link>
    ));

  const divider = <span className="h-5 w-px shrink-0 bg-midnight-navy/15" aria-hidden="true" />;

  return (
    <div className="bg-ivory">
      {/* Header — kept short so the first pieces arrive on the first phone screen */}
      <section className="mx-auto max-w-[1600px] px-4 sm:px-6 pt-4 sm:pt-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs uppercase tracking-[0.2em] text-midnight-navy/50">
          <BackButton fallbackHref="/" className="shrink-0" />
          <span aria-hidden="true" className="text-champagne-gold/50">|</span>
          <Link href="/" className="hover:text-midnight-navy">Home</Link>
          <span aria-hidden="true" className="text-champagne-gold">/</span>
          {basePath === "/collection" ? (
            <span aria-current="page" className="text-midnight-navy">Shop</span>
          ) : (
            <>
              <Link href="/collection" className="hover:text-midnight-navy">Shop</Link>
              {crumbs.map((c) => (
                <span key={c.href} className="contents">
                  <span aria-hidden="true" className="text-champagne-gold">/</span>
                  <Link href={c.href} className="hover:text-midnight-navy">{c.label}</Link>
                </span>
              ))}
              <span aria-hidden="true" className="text-champagne-gold">/</span>
              <span aria-current="page" className="text-midnight-navy">{title}</span>
            </>
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
      {pillGroups.length > 0 && (
        <nav aria-label="Categories" className="mt-4">
          <ul className="mx-auto flex max-w-[1600px] items-center gap-2 overflow-x-auto px-4 sm:px-6 pb-1 hide-scrollbar">
            <li className="shrink-0">
              <Link href={allHref} aria-current={!activeSlug && basePath === allHref ? "page" : undefined} className={`${chipClass(!activeSlug && basePath === allHref)} h-10 px-4`}>
                All
              </Link>
            </li>
            {pillGroups.map((group) => (
              <li key={group.line} className="contents">
                {showGroupLabels && (
                  <Link
                    href={LINES[group.line].href}
                    className="ml-2 shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.25em] text-champagne-gold hover:text-midnight-navy"
                  >
                    {LINES[group.line].name}
                  </Link>
                )}
                {group.items.map((c) => {
                  const active = c.slug === activeSlug;
                  return (
                    <span key={c.slug} className="shrink-0">
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
                    </span>
                  );
                })}
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Sort + line + type + price — sticks under the header while browsing */}
      {result.total > 0 && (
        <div className="sticky top-[79px] z-30 mt-3 border-y border-champagne-gold/20 bg-ivory/95 backdrop-blur lg:top-[81px]">
          <div className="mx-auto flex max-w-[1600px] items-center gap-2 overflow-x-auto px-4 sm:px-6 py-2 hide-scrollbar">
            <SortSelect basePath={basePath} params={params} />
            {result.lineChips.length > 0 && (
              <>
                {divider}
                {chips(result.lineChips, (key) => shopHref(basePath, { ...params, line: key, type: undefined }))}
              </>
            )}
            {result.typeChips.length > 0 && (
              <>
                {divider}
                {chips(result.typeChips, (key) => shopHref(basePath, { ...params, type: key }))}
              </>
            )}
            {result.priceChips.length > 0 && (
              <>
                {divider}
                {chips(result.priceChips, (key) => shopHref(basePath, { ...params, price: key }))}
              </>
            )}
          </div>
        </div>
      )}

      <section className="mx-auto max-w-[1600px] px-4 sm:px-6 pb-16 pt-4 sm:pt-6">
        {filtered && count > 0 && (
          <p className="mb-3 text-xs text-midnight-navy/60">
            Showing {count} of {result.total} pieces ·{" "}
            <Link href={clear} scroll={false} className="font-semibold text-champagne-gold">
              Clear filters
            </Link>
          </p>
        )}

        {count > 0 && showOffers && <OfferCarousel className="mb-6 hidden md:block" />}

        {count > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {result.items.map((product, index) => (
              <GridItem key={product.id} index={index} showLadder={showLadder}>
                <ProductCard product={product} categoryName={categoryName} className="h-full" />
              </GridItem>
            ))}
          </ul>
        ) : result.total > 0 ? (
          <div className="rounded-2xl border border-champagne-gold/25 bg-sand/50 px-4 sm:px-6 py-12 text-center">
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
        ) : line === "adorn" ? (
          <div className="rounded-2xl border border-champagne-gold/25 bg-midnight-navy px-4 sm:px-6 py-14 text-center text-ivory">
            <p className="text-[0.68rem] uppercase tracking-[0.3em] text-champagne-gold">Coming soon</p>
            <p className="mt-3 font-heading text-3xl text-champagne-gold sm:text-4xl">OJARA Adorn is almost here</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ivory/75">
              Necklace sets with matching earrings — for festive days, parties and every day in
              between. Leave your email below to hear the day it opens.
            </p>
            <Link
              href="/intentions"
              className="mt-6 inline-flex rounded-full bg-champagne-gold px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] text-midnight-navy"
            >
              Meanwhile, shop Intentions
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-champagne-gold/25 bg-sand/50 px-4 sm:px-6 py-16 text-center">
            <p className="font-heading text-2xl text-midnight-navy">New pieces are on their way.</p>
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

        {/* Each line's own reels: the gemstone reels say "natural" and
            "certificate", which Adorn's stone jewellery never claims. */}
        {line === "adorn" ? (
          <ShoppableReels
            reels={reelsForTags(["lifestyle", "unboxing", "trust"], 10, "adorn")}
            eyebrow="See it before you buy"
            title="Every colour, on camera"
            subtitle="On the stand, in the hand and worn — tap a reel, add the set without leaving the video."
            className="mt-14"
          />
        ) : (
          <ShoppableReels
            reels={reelsForTags(reelTagsFor(activeSlug), 10)}
            eyebrow="Watch before you buy"
            title="Unboxed, worn and explained"
            subtitle="Tap a reel to watch with sound — add the piece without leaving the video."
            className="mt-14"
          />
        )}
      </section>

      {line === "adorn" && result.total === 0 && <Newsletter />}
      <BrandTags line={line} />
    </div>
  );
}

/**
 * The offers row goes after a complete grid row: after 4 cards on phones (2 rows)
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
          <OffersTile />
        </li>
      )}
      {showLadder && index === 5 && (
        <li className="hidden md:col-span-3 md:block lg:hidden">
          <OffersTile />
        </li>
      )}
    </>
  );
}
