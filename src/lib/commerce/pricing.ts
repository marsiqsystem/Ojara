// ============================================================================
// Pricing engine — the Viora "tigdam", ported to OJARA (bundle §5).
//
// ONE place for every number, so the frontend never drifts from the Wix coupon
// dashboard. Read the rules below before changing anything.
//
//   • subtotal        — Σ price×qty. The ONLY number allowed to touch money.
//   • prepaid −₹49    — flat online-payment discount. Client-side, STACKS on top
//                       of any coupon, and is NOT a Wix coupon (Wix can't model a
//                       stacking flat discount — §8 reconciles it on the order).
//   • offers          — Wix AUTOMATIC discount rules (bracelet + ring 10%, buy 2
//                       get 1). No code: Wix applies them to the order itself, so
//                       the bag asks Wix what they're worth (/api/offers,
//                       useWixOffers). The offer list lives in ./offers.ts.
//   • coupon         — validated LIVE by Wix's engine via /api/coupon (the
//                       useLiveCoupon hook). The tiers below are now a FALLBACK
//                       only: they power the "add ₹X to unlock" nudge and keep the
//                       two legacy codes working if Wix is ever unreachable. Codes
//                       the owner creates in Wix work WITHOUT being added here.
//   • no fake fees    — checkout used to show a ₹99 shipping and ₹50 "processing"
//                       fee struck off. Neither was ever charged, so it was an
//                       invented saving. Shipping reads a plain "FREE"; don't add
//                       a shown-then-waived fee back unless it's a real charge.
//   • total          — max(0, subtotal − offers − couponDiscount − prepaidDiscount).
//                       THIS is what Razorpay charges.
//
// NOTE: since coupons are now validated live against Wix (/api/coupon), you no
// longer have to mirror every dashboard coupon here. Keep a tier only if you want
// it to drive the cart "unlock" nudge, or as an offline fallback for a headline
// code. Wix remains the authority on validity, expiry, minimums and per-buyer use.
// ============================================================================

/** Flat "pay online" discount — the poster's "₹49 off on prepaid orders".
 *  Stacks on any coupon. Not a Wix coupon. */
export const PREPAID_DISCOUNT = 49;

export type CouponType = "FLAT" | "PERCENT";

export interface CouponTier {
  code: string;
  type: CouponType;
  /** Minimum cart subtotal (₹) required for the code to apply. */
  minimum: number;
  /** For FLAT: rupees off. For PERCENT: a rate like 0.1 (= 10%). */
  value: number;
  /** Shopper-facing one-liner for the "unlock" nudge. */
  label: string;
}

// ---- Auto-applied code -------------------------------------------------------
// The code the bag applies by itself (useAutoTierCoupon), so nobody has to find
// or type it. Wix allows one coupon per order; a code the shopper types replaces
// it. Wix stays the authority (limits, expiry): if it refuses the code the bag
// drops it — quietly in the bag, with a word at checkout once the email is known.
//
// These MUST mirror coupons that exist in the Wix dashboard, codes matched
// case-insensitively. The offers running as of 2026-09-22 (owner's poster):
//
// WELCOME10 — 10% off, first purchase (Wix: one use per customer, minimum ₹1).
//             Wix stacks it on top of the automatic bracelet + ring 10%.
//
// The old spend ladder (OJAS10 10% @₹1,499 / OJAS15 15% @₹2,499) was never a
// running offer and is gone. OJAS10 and FOUNDER15 still exist in Wix and work
// when typed — /api/coupon validates any code live.
export const COUPON_TIERS: CouponTier[] = [
  {
    code: "WELCOME10",
    type: "PERCENT",
    minimum: 1,
    value: 0.1,
    label: "10% off your first order",
  },
];

/** Whole-number percent for display, e.g. 0.15 → 15. */
export const tierPercent = (tier: CouponTier): number => Math.round(tier.value * 100);

/** Highest step `subtotal` qualifies for (skipping codes Wix has refused), or undefined. */
export const bestTierFor = (
  subtotal: number,
  unavailable: ReadonlySet<string> = new Set(),
): CouponTier | undefined =>
  [...COUPON_TIERS]
    .reverse()
    .find((t) => subtotal >= t.minimum && !unavailable.has(t.code));

/** Next step still to unlock, or undefined once the top step is reached. */
export const nextTierFor = (subtotal: number): CouponTier | undefined =>
  COUPON_TIERS.find((t) => subtotal < t.minimum);

export const isTierCode = (code: string): boolean =>
  COUPON_TIERS.some((t) => t.code === code.trim().toUpperCase());

export interface PricedLine {
  price: number;
  quantity: number;
}

export const cartSubtotal = (lines: PricedLine[]): number =>
  lines.reduce(
    (sum, l) => sum + (Number(l.price) || 0) * (Number(l.quantity) || 0),
    0,
  );

/**
 * Frontend coupon mirror. Returns the discount a code WOULD give at this subtotal,
 * or an error string if it can't apply. In live mode Wix is authoritative; this is
 * the pre-apply preview + the fallback when Wix reports no amount.
 */
export const evaluateCoupon = (
  rawCode: string,
  subtotal: number,
): { discount: number; error: string; tier?: CouponTier } => {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) return { discount: 0, error: "Enter a coupon code." };

  const tier = COUPON_TIERS.find((t) => t.code.toUpperCase() === code);
  if (!tier) return { discount: 0, error: "That code isn’t valid." };

  if (subtotal < tier.minimum) {
    return {
      discount: 0,
      error: `Add ₹${tier.minimum - subtotal} more to use ${tier.code}.`,
      tier,
    };
  }

  const discount =
    tier.type === "FLAT"
      ? tier.value
      : Math.round(subtotal * tier.value);
  return { discount, error: "", tier };
};

export interface TotalsInput {
  lines: PricedLine[];
  isPrepaid: boolean;
  /** Discount reported by Wix (live) — takes precedence over the mirror. */
  wixReportedDiscount?: number;
  /** Coupon code currently on the cart, if any (used by the mirror fallback). */
  appliedCouponCode?: string;
  /** Wix automatic-offer savings on this cart (₹) — from useWixOffers. */
  offerDiscount?: number;
  /**
   * Sacred Bundle discount (₹) earned in the checkout upsell. Like the prepaid
   * −₹50 this is NOT a Wix coupon and STACKS on top of one; /api/checkout
   * reconciles it onto the order as a GLOBAL custom discount. See bundle.ts.
   */
  bundleDiscount?: number;
}

export interface Totals {
  subtotal: number;
  /** Automatic offers (bracelet + ring, buy 2 get 1) that Wix applies itself. */
  offerDiscount: number;
  couponDiscount: number;
  prepaidDiscount: number;
  /** Sacred Bundle discount folded into the total (0 when none earned). */
  bundleDiscount: number;
  /** The real amount charged. Never negative. */
  total: number;
}

/**
 * The single source of truth for what the shopper pays. Pure — safe to memoize.
 */
export const computeTotals = ({
  lines,
  isPrepaid,
  wixReportedDiscount,
  appliedCouponCode,
  offerDiscount = 0,
  bundleDiscount = 0,
}: TotalsInput): Totals => {
  const subtotal = cartSubtotal(lines);

  // Trust Wix's reported amount when present; otherwise fall back to the mirror.
  let couponDiscount = 0;
  if (typeof wixReportedDiscount === "number" && wixReportedDiscount > 0) {
    couponDiscount = wixReportedDiscount;
  } else if (appliedCouponCode) {
    couponDiscount = evaluateCoupon(appliedCouponCode, subtotal).discount;
  }

  const prepaidDiscount = isPrepaid ? PREPAID_DISCOUNT : 0;
  const bundle = Math.max(0, Math.round(bundleDiscount));
  const offers = Math.max(0, Math.round(offerDiscount));
  const total = Math.max(0, subtotal - offers - couponDiscount - prepaidDiscount - bundle);

  return {
    subtotal,
    offerDiscount: offers,
    couponDiscount,
    prepaidDiscount,
    bundleDiscount: bundle,
    total,
  };
};
