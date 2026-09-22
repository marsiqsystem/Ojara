// ============================================================================
// Media library — every reel, banner and offer square on the site, in ONE list,
// so each page can pick what's relevant to it (the Money Magnet page gets the
// Money Magnet reels; a page about rings gets the bracelet + ring artwork).
//
// Files live in public/media/ (web-encoded from the owner's Drive exports,
// 2026-09-22: 720p/540p H.264 with faststart, WebP artwork).
//
// Two honesty rules:
//   1. `offers` lists every offer a piece PROMISES (in its artwork or voice-
//      over). allOffersLive() hides it until each one is honoured at checkout —
//      e.g. a reel promising Buy 2 Get 1 waits for it (lib/commerce/offers).
//   2. `kind` says who is on screen. "creator" = a creator/actor video OJARA
//      made; never labelled as a customer review. Only "customer" may be — and
//      there are none yet.
//
// Left out on purpose: `ojara_aaa` (Money Magnet, but it cuts in a podcast clip of
// actor Ravi Kishan — using a celebrity implies an endorsement OJARA may not
// have rights to). Add it here only once the owner confirms the rights.
// Removed at the owner's request, 2026-09-22: `mm-599` (also quoted ₹599; the
// bracelet sells at ₹899) and `natural-offer`.
// ============================================================================

import { allOffersLive, type OfferKey } from "./commerce/offers";

export type ReelKind = "brand" | "creator" | "customer";

export interface Reel {
  id: string;
  /** The full reel (540p, with sound) — only for the big player and the product gallery. */
  src: string;
  /**
   * A silent 12-second, 432px-wide loop (~0.6 MB, vs 1–5 MB for the full reel)
   * for the small autoplaying spots: floating mini reel, reel cards, feature tiles.
   */
  preview: string;
  poster: string;
  /** Short line on the card — what the viewer gets from watching. */
  title: string;
  alt: string;
  kind: ReelKind;
  /** Has speech worth hearing — the player opens with sound. */
  talking: boolean;
  /**
   * Which pieces it shows: lower-case words that must ALL appear in a product's
   * name (e.g. ["money", "magnet"]). Empty = about OJARA in general.
   */
  product?: string[];
  /** …and none of these (keeps a Citrine reel off the Citrine Pyrite page). */
  not?: string[];
  /** Offers it promises — hidden until all are live. */
  offers?: OfferKey[];
  /** Topics, for picking reels for a page that has no product of its own. */
  tags: ("wealth" | "calm" | "protection" | "love" | "trust" | "unboxing" | "offer" | "combo" | "lifestyle")[];
}

const reel = (id: string, r: Omit<Reel, "id" | "src" | "preview" | "poster">): Reel => ({
  id,
  src: `/media/reels/${id}.mp4`,
  preview: `/media/reels/preview/${id}.mp4`,
  poster: `/media/reels/${id}.jpg`,
  ...r,
});

// Order = priority when a page shows "the best few".
export const REELS: Reel[] = [
  reel("citrine-car", {
    title: "“100% natural, and it comes certified”",
    alt: "A creator talks about her natural crystal bracelet in her car",
    kind: "creator",
    talking: true,
    product: ["citrine", "bracelet"],
    not: ["pyrite"],
    tags: ["wealth", "trust"],
  }),
  reel("mm-friends", {
    title: "“Where did you get this?” — Money Magnet",
    alt: "A friend shows off her Money Magnet bracelet and warns about fakes",
    kind: "creator",
    talking: true,
    product: ["money", "magnet"],
    tags: ["wealth", "trust"],
  }),
  reel("mm-explained", {
    title: "What is Money Magnet? Unboxed and explained",
    alt: "A creator unboxes the Money Magnet bracelet and shows its authenticity certificate",
    kind: "creator",
    talking: true,
    product: ["money", "magnet"],
    tags: ["wealth", "trust", "unboxing"],
  }),
  reel("citrine-review", {
    title: "Before a big step — why Citrine",
    alt: "A creator talks about the Citrine bracelet and its certificate",
    kind: "creator",
    talking: true,
    product: ["citrine", "bracelet"],
    not: ["pyrite"],
    tags: ["wealth", "trust"],
  }),
  reel("mm-film", {
    title: "Money Magnet — citrine, pyrite, tiger eye, aventurine",
    alt: "Money Magnet bracelet close-up: citrine, pyrite, tiger eye and green aventurine beads",
    kind: "brand",
    talking: false,
    product: ["money", "magnet"],
    tags: ["wealth"],
  }),
  reel("mm-wear", {
    title: "Money Magnet, worn every day",
    alt: "Money Magnet bracelet worn through a working day",
    kind: "brand",
    talking: false,
    product: ["money", "magnet"],
    tags: ["wealth", "lifestyle"],
  }),
  reel("mm-call", {
    title: "Money Magnet is calling…",
    alt: "Animated phone call from the Money Magnet bracelet",
    kind: "brand",
    talking: false,
    product: ["money", "magnet"],
    tags: ["wealth"],
  }),
  reel("unboxing", {
    title: "Unboxing an OJARA order",
    alt: "An OJARA gift box unboxed: bracelet, certificate and packing",
    kind: "brand",
    talking: false,
    tags: ["unboxing", "trust"],
  }),
  reel("amethyst-review", {
    title: "Why I switched to a natural Amethyst",
    alt: "A creator talks about her natural Amethyst bracelet",
    kind: "creator",
    talking: true,
    product: ["amethyst", "bracelet"],
    tags: ["calm", "trust"],
  }),
  reel("lapis-unboxing", {
    title: "Let’s unbox: Lapis Lazuli",
    alt: "Unboxing a Lapis Lazuli bracelet with its certificate",
    kind: "brand",
    talking: false,
    product: ["lapis", "bracelet"],
    tags: ["unboxing", "trust"],
  }),
  reel("natural-crystal-review", {
    title: "“You can see it’s a natural crystal”",
    alt: "A creator shows her natural crystal bracelet",
    kind: "creator",
    talking: true,
    tags: ["trust"],
  }),
  reel("worn-together", {
    title: "Bracelets and rings, worn together",
    alt: "OJARA gemstone bracelets and rings stacked and worn together",
    // Source clip (ojara_pd) had a licensed-sounding pop song — published silent.
    kind: "brand",
    talking: false,
    tags: ["combo", "lifestyle"],
  }),
  reel("packing", {
    title: "Packing your order, with its certificate",
    alt: "An OJARA order being packed with its authenticity certificate",
    kind: "brand",
    talking: false,
    tags: ["unboxing", "trust"],
  }),
];

/** Reels whose every promised offer is live. */
export const liveReels = (): Reel[] => REELS.filter((r) => allOffersLive(r.offers ?? []));

const words = (name: string) => name.toLowerCase().split(/[^a-z]+/).filter(Boolean);

/** Does this reel show this product? */
export const reelShowsProduct = (r: Reel, productName: string): boolean => {
  if (!r.product?.length) return false;
  const w = words(productName);
  return r.product.every((k) => w.includes(k)) && !(r.not ?? []).some((k) => w.includes(k));
};

/**
 * Reels for a product page: its own reels first, then trust / unboxing reels
 * about OJARA in general (never another product's reels — a Citrine video on the
 * Amethyst page is noise). Capped at `limit`.
 */
export const reelsForProduct = (productName: string, limit = 6): Reel[] => {
  const live = liveReels();
  const own = live.filter((r) => reelShowsProduct(r, productName));
  const general = live.filter((r) => !r.product?.length && r.tags.includes("trust"));
  return [...own, ...general].slice(0, limit);
};

/** Reels for a topic (home, a category page): tagged reels first, then trust. */
export const reelsForTags = (tags: Reel["tags"], limit = 8): Reel[] => {
  const live = liveReels();
  const tagged = live.filter((r) => r.tags.some((t) => tags.includes(t)));
  const rest = live.filter((r) => !tagged.includes(r) && r.tags.includes("trust"));
  return [...tagged, ...rest].slice(0, limit);
};

// ---- Offer artwork ------------------------------------------------------------

export interface OfferArt {
  id: string;
  /** Wide banner (1600×671) — desktop, or compact strips. */
  src: string;
  width: number;
  height: number;
  alt: string;
  offers: OfferKey[];
  href: string;
}

const wide = (id: string, alt: string, offers: OfferKey[], href = "/collection"): OfferArt => ({
  id,
  src: `/media/offers/${id}.webp`,
  width: 1600,
  height: 671,
  alt,
  offers,
  href,
});

const square = (id: string, alt: string, offers: OfferKey[], href = "/collection"): OfferArt => ({
  id,
  src: `/media/offers/${id}.webp`,
  width: 1080,
  height: 1080,
  alt,
  offers,
  href,
});

// Owner artwork is checked for complete, correct copy before it goes in: the
// "Welcome To / first purchase…" designs (banner9, carousel1) were dropped —
// "Welcome To" ends mid-sentence.
const WELCOME_ALT = "Welcome — 10% off your first purchase with code WELCOME10";
const COMBO_ALT = "Buy a combo of 1 bracelet and 1 ring, get 10% off";
const B2G1_BOTH_ALT = "Buy 2 bracelets get 1 free, buy 2 rings get 1 free";
const ALL_ALT =
  "Welcome to first purchase, 10% off with WELCOME10 · Buy 2 Get 1 Free bracelet · ₹49 off prepaid orders · Buy 1 bracelet and 1 ring get 10% off";

/**
 * Wide banners, best first. The all-offer posters take over once every offer is
 * live — but their headline reads "Welcome to first purchase you will get 10%
 * off"; ask the owner for a corrected line before BUY2GET1_LIVE + prepaid go on.
 */
export const WIDE_BANNERS: OfferArt[] = [
  wide("all-2", ALL_ALT, ["welcome", "b2g1", "prepaid", "combo"]),
  wide("all-4", ALL_ALT, ["welcome", "b2g1", "prepaid", "combo"]),
  wide("combo-2", COMBO_ALT, ["combo"], "/collection?type=rings"),
  wide("b2g1-both-2", B2G1_BOTH_ALT, ["b2g1", "b2g1Rings"], "/collection?type=bracelets"),
  wide("welcome-2", WELCOME_ALT, ["welcome"]),
  wide("combo-1", COMBO_ALT, ["combo"], "/collection?type=rings"),
];

/** Square offer cards (1080²) — phones, and product galleries. */
export const SQUARE_OFFERS: OfferArt[] = [
  square("sq-combo", "Buy 1 bracelet and 1 ring, get 10% off", ["combo"], "/collection?type=rings"),
  square("sq-b2g1-bracelets", "Buy 2 get 1 free on bracelets", ["b2g1"], "/collection?type=bracelets"),
  square("sq-prepaid", "Special offer: ₹49 off on prepaid orders", ["prepaid"]),
  square("sq-b2g1-both-1", B2G1_BOTH_ALT, ["b2g1", "b2g1Rings"]),
];

/** Trust cards (no offer) — exchange and confidence. */
export const TRUST_SQUARES: OfferArt[] = [
  square("sq-exchange", "Easy exchange — if there's an issue with your order, we're here to help", []),
  square("sq-confidence", "Shop with confidence — your perfect crystal is just a click away", []),
];

export const liveArt = (list: OfferArt[]): OfferArt[] => list.filter((a) => allOffersLive(a.offers));

/**
 * Up to `limit` wide banners that don't repeat an offer (so the carousel never
 * shows two welcome banners in a row while other offers wait).
 */
export const bannerSet = (limit = 4): OfferArt[] => {
  const seen = new Set<string>();
  const out: OfferArt[] = [];
  for (const a of liveArt(WIDE_BANNERS)) {
    const key = [...a.offers].sort().join("+");
    if (seen.has(key)) continue;
    // Once an all-offer poster is in, single-offer banners only repeat it.
    if (out.some((o) => o.offers.length > 1 && a.offers.every((k) => o.offers.includes(k)))) continue;
    seen.add(key);
    out.push(a);
    if (out.length >= limit) break;
  }
  return out;
};

/**
 * The piece a reel sells: the first in-stock product it shows (so "Shop this"
 * never leads to a sold-out page). Undefined for general reels.
 */
export const productForReel = <P extends { name: string; stockCount: number }>(
  r: Reel,
  catalog: P[],
): P | undefined =>
  r.product?.length
    ? catalog.find((p) => p.stockCount > 0 && reelShowsProduct(r, p.name))
    : undefined;

/**
 * The reel for a product's gallery (2nd slot): its own silent brand film if it
 * has one — it reads as product footage — else its first own reel.
 */
export const galleryReelFor = (productName: string): Reel | undefined => {
  const own = liveReels().filter((r) => reelShowsProduct(r, productName));
  return own.find((r) => r.kind === "brand" && !r.talking) ?? own[0];
};

