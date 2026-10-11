// ============================================================================
// The offers OJARA actually runs — ONE list, so the offer bar, home page, shop
// grid, product page, bag and checkout all say the same thing.
//
// Source: the owner's offer poster, 2026-09-22.
//
//   1. WELCOME10 — 10% off the first purchase. A Wix coupon (one use per
//      customer). The bag applies it by itself — see COUPON_TIERS in ./pricing.
//   2. Buy 2 bracelets, get 1 free — a Wix AUTOMATIC "buy X get Y" discount on
//      the Bracelets category (owner re-created it 2026-09-22; the old B2G1FREE
//      coupon failed on Catalog V3). Every 3rd bracelet free — Wix frees the
//      lowest-priced one. Rings don't count.
//   3. ₹49 off prepaid — PREPAID_DISCOUNT in ./pricing, shown only once online
//      payment is on (PREPAID_ENABLED).
//   4. Bracelet + ring — a Wix AUTOMATIC "buy X get Y": buy 1 bracelet, get 10%
//      off 1 ring. The 10% comes off the RING only, once per bracelet + ring pair
//      (owner OK'd, 2026-09-22). No code.
//   5. Buy 2 Adorn pieces, get 1 free — owner's call 2026-10-11, for the
//      jewellery sets. A separate Wix AUTOMATIC "buy X get Y" on the Adorn
//      category (the lowest-priced of every 3 free). Bracelets and Adorn never
//      count towards each other. Off (ADORN_B2G1_LIVE) until Wix has the rule.
//
// Wix applies 2 and 4 to the order itself, and stacks WELCOME10 on top (owner
// OK'd stacking, 2026-09-22). The bag therefore asks Wix what they're worth
// (useWixOffers); estimateOffers below is only a preview for places that have no
// Wix answer (product page cards) and a fallback when Wix can't be reached.
// Checked against Wix's totals, 2026-09-22.
// ============================================================================

import { PREPAID_ENABLED } from "./config";
import { COUPON_TIERS, PREPAID_DISCOUNT } from "./pricing";
import { lineOf, pieceTypeOf, type Classifiable } from "@/lib/lines";

/** "Buy 2 get 1 free" on bracelets — live in Wix as an AUTOMATIC discount. */
export const BUY2GET1_LIVE = true;

/**
 * Buy 2 RINGS get 1 free — on some of the owner's banners, not on the poster.
 * Its coupon (B2G1RINGS) fails like B2G1FREE; flip once it's a Wix automatic
 * discount too. Only gates artwork — no pricing preview models it.
 */
export const BUY2GET1_RINGS_LIVE = false;

/**
 * Buy 2 get 1 free on Adorn (jewellery sets). Flip to true only after Wix's
 * automatic rule on the Adorn category exists AND a read-only /api/offers
 * check of 3 sets returns the free one.
 */
export const ADORN_B2G1_LIVE = false;

export type OfferKey = "welcome" | "combo" | "b2g1" | "b2g1Rings" | "b2g1Adorn" | "prepaid";

/** Is this offer honoured at checkout right now? Artwork naming it hides until it is. */
export const isOfferLive = (key: OfferKey): boolean => {
  switch (key) {
    case "welcome":
    case "combo":
      return true;
    case "b2g1":
      return BUY2GET1_LIVE;
    case "b2g1Rings":
      return BUY2GET1_RINGS_LIVE;
    case "b2g1Adorn":
      return ADORN_B2G1_LIVE;
    case "prepaid":
      return PREPAID_ENABLED;
  }
};

/** True when every offer a piece of artwork advertises is live. */
export const allOffersLive = (keys: readonly OfferKey[]): boolean => keys.every(isOfferLive);

export const WELCOME_CODE = COUPON_TIERS[0]?.code ?? "WELCOME10";
export const WELCOME_PERCENT = Math.round((COUPON_TIERS[0]?.value ?? 0.1) * 100);
export const COMBO_PERCENT = 10;

/**
 * How a piece counts for the automatic offers. Wix's rules key on categories:
 * Bracelets and Rings hold the gemstone (Intentions) pieces, Adorn the stone
 * jewellery. An Adorn piece never counts as a bracelet or ring (no bracelet
 * B2G1, no ring 10%) — only towards its own buy 2 get 1. Keep Adorn pieces OUT
 * of Wix's Bracelets / Rings categories so Wix agrees.
 */
export type PieceKind = "bracelet" | "ring" | "adorn";

export const pieceKind = (p: Classifiable): PieceKind => {
  if (lineOf(p) === "adorn") return "adorn";
  return pieceTypeOf(p) === "ring" ? "ring" : "bracelet";
};

export interface OfferLine extends Classifiable {
  price: number;
  quantity: number;
}

/** An OfferLine from a bag entry — carries the line so Adorn is never miscounted. */
export const offerLineOf = (
  product: Classifiable & { price: number },
  quantity: number,
): OfferLine => ({
  name: product.name,
  line: product.line,
  pieceType: product.pieceType,
  price: product.price,
  quantity,
});

export interface BagMix {
  bracelets: number;
  rings: number;
  /** Adorn pieces — their own buy 2 get 1; they also steer "complete the look". */
  adorn: number;
}

export const bagMix = (lines: OfferLine[]): BagMix =>
  lines.reduce<BagMix>(
    (mix, l) => {
      const n = Math.max(0, Math.floor(l.quantity || 0));
      const kind = pieceKind(l);
      if (kind === "ring") mix.rings += n;
      else if (kind === "bracelet") mix.bracelets += n;
      else mix.adorn += n;
      return mix;
    },
    { bracelets: 0, rings: 0, adorn: 0 },
  );

export interface OfferEstimate {
  /** Bracelet + ring: 10% off one ring per bracelet (₹). */
  combo: number;
  /** Rings that get the 10%. */
  comboCount: number;
  /** Value of the free bracelets (₹); 0 while BUY2GET1_LIVE is false. */
  free: number;
  /** Bracelets that come free. */
  freeCount: number;
  /** Value of the free Adorn pieces (₹); 0 while ADORN_B2G1_LIVE is false. */
  adornFree: number;
  /** Adorn pieces that come free. */
  adornFreeCount: number;
  total: number;
}

/**
 * What the automatic offers should take off these lines, by the rules as the
 * owner describes them. A PREVIEW — the bag shows Wix's own figure instead.
 */
export const estimateOffers = (lines: OfferLine[]): OfferEstimate => {
  const mix = bagMix(lines);
  // Each piece, one entry per unit, cheapest first — Wix's buy X get Y
  // discounts the lowest-priced qualifying pieces.
  const units = (kind: PieceKind) =>
    lines
      .filter((l) => pieceKind(l) === kind)
      .flatMap((l) => Array.from({ length: Math.max(0, Math.floor(l.quantity || 0)) }, () => l.price))
      .sort((a, b) => a - b);

  const comboCount = Math.min(mix.bracelets, mix.rings);
  const combo = units("ring")
    .slice(0, comboCount)
    .reduce((s, p) => s + Math.round(p * (COMBO_PERCENT / 100)), 0);

  const freeCount = BUY2GET1_LIVE ? Math.floor(mix.bracelets / 3) : 0;
  const free = units("bracelet").slice(0, freeCount).reduce((s, p) => s + p, 0);

  const adornFreeCount = ADORN_B2G1_LIVE ? Math.floor(mix.adorn / 3) : 0;
  const adornFree = units("adorn").slice(0, adornFreeCount).reduce((s, p) => s + p, 0);

  return { combo, comboCount, free, freeCount, adornFree, adornFreeCount, total: combo + free + adornFree };
};

export interface OfferNudge {
  /** Which offer adding this piece earns. */
  offer: "b2g1" | "b2g1Adorn" | "combo";
  /** What to add. */
  add: PieceKind;
  /** How many to add. */
  count: number;
  /** Shopper-facing headline, e.g. "Add 1 more bracelet — it's free". */
  message: string;
  /** One line of small print under it. */
  detail: string;
}

/**
 * Every offer this bag is close to, most valuable first — the bag and checkout
 * show a row of pieces for each. Buy 2 get 1 leads for bracelet bags (a whole
 * bracelet free beats 10% off a ring); it's only offered while the next free
 * bracelet is 1–2 pieces away.
 */
export const offerNudges = (mix: BagMix): OfferNudge[] => {
  const nudges: OfferNudge[] = [];
  const toFree = 3 - (mix.bracelets % 3);
  if (BUY2GET1_LIVE && mix.bracelets > 0 && toFree <= 2) {
    nudges.push(
      toFree === 1
        ? {
            offer: "b2g1",
            add: "bracelet",
            count: 1,
            message: "Add 1 more bracelet — get 1 free",
            detail: "Buy 2, get 1 free: the lowest-priced of your 3 bracelets is on us.",
          }
        : {
            offer: "b2g1",
            add: "bracelet",
            count: 2,
            message: "Add 2 more bracelets — 1 is free",
            detail: "Buy 2, get 1 free: 3 bracelets for the price of 2. The lowest-priced one is on us.",
          },
    );
  }
  // Adorn: the same buy 2 get 1, counted on its own pieces ("pick 3 colours").
  const toFreeAdorn = 3 - (mix.adorn % 3);
  if (ADORN_B2G1_LIVE && mix.adorn > 0 && toFreeAdorn <= 2) {
    nudges.push(
      toFreeAdorn === 1
        ? {
            offer: "b2g1Adorn",
            add: "adorn",
            count: 1,
            message: "Add 1 more set — get 1 free",
            detail: "Buy 2, get 1 free on jewellery: the lowest-priced of your 3 pieces is on us.",
          }
        : {
            offer: "b2g1Adorn",
            add: "adorn",
            count: 2,
            message: "Add 2 more sets — 1 is free",
            detail: "Buy 2, get 1 free on jewellery: 3 pieces for the price of 2. Another colour counts.",
          },
    );
  }
  if (mix.bracelets > mix.rings) {
    nudges.push({
      offer: "combo",
      add: "ring",
      count: 1,
      message: `Add a ring — get ${COMBO_PERCENT}% off the ring`,
      detail: `Bracelet + ring offer: ${COMBO_PERCENT}% comes off the ring by itself, no code needed.`,
    });
  } else if (mix.rings > mix.bracelets) {
    nudges.push({
      offer: "combo",
      add: "bracelet",
      count: 1,
      message: `Add a bracelet — get ${COMBO_PERCENT}% off your ring`,
      detail: `Bracelet + ring offer: ${COMBO_PERCENT}% comes off the ring by itself, no code needed.`,
    });
  }
  return nudges;
};

/** The single most valuable next step, or null — for one-line spots (offer bar, shop tile). */
export const nextOfferNudge = (mix: BagMix): OfferNudge | null => offerNudges(mix)[0] ?? null;

export interface OfferCard {
  key: "welcome" | "b2g1" | "b2g1Adorn" | "combo" | "prepaid";
  /** Short headline, e.g. "Buy 2 Get 1 Free". */
  title: string;
  /** One line under it. */
  detail: string;
  /** A code to show, if the offer has one. */
  code?: string;
}

/** The offers it's honest to advertise right now, in the poster's order. */
export const liveOffers = (): OfferCard[] => [
  {
    key: "welcome",
    title: `${WELCOME_PERCENT}% off your first order`,
    detail: `Code ${WELCOME_CODE} — added to your bag for you`,
    code: WELCOME_CODE,
  },
  ...(BUY2GET1_LIVE
    ? [
        {
          key: "b2g1" as const,
          title: "Buy 2 Get 1 Free",
          detail: "On gemstone bracelets — the third one is on us",
        },
      ]
    : []),
  ...(ADORN_B2G1_LIVE
    ? [
        {
          key: "b2g1Adorn" as const,
          title: "Buy 2 Get 1 Free · jewellery sets",
          detail: "Pick any 3 sets or colours — the lowest-priced one is on us",
        },
      ]
    : []),
  ...(PREPAID_ENABLED
    ? [
        {
          key: "prepaid" as const,
          title: `₹${PREPAID_DISCOUNT} off prepaid orders`,
          detail: "Pay by UPI or card at checkout",
        },
      ]
    : []),
  {
    key: "combo",
    title: `Bracelet + ring: ${COMBO_PERCENT}% off the ring`,
    detail: "A gemstone bracelet with a gemstone ring — no code needed",
  },
];
