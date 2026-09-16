// ============================================================================
// Pricing engine — the Viora "tigdam", ported to OJARA (bundle §5).
//
// ONE place for every number, so the frontend never drifts from the Wix coupon
// dashboard. Read the rules below before changing anything.
//
//   • subtotal        — Σ price×qty. The ONLY number allowed to touch money.
//   • prepaid −₹50    — flat online-payment discount. Client-side, STACKS on top
//                       of any coupon, and is NOT a Wix coupon (Wix can't model a
//                       stacking flat discount — §8 reconciles it on the order).
//   • coupon          — validated LIVE by Wix's engine via /api/coupon (the
//                       useLiveCoupon hook). The tiers below are now a FALLBACK
//                       only: they power the "add ₹X to unlock" nudge and keep the
//                       two legacy codes working if Wix is ever unreachable. Codes
//                       the owner creates in Wix work WITHOUT being added here.
//   • no fake fees    — checkout used to show a ₹99 shipping and ₹50 "processing"
//                       fee struck off. Neither was ever charged, so it was an
//                       invented saving. Shipping reads a plain "FREE"; don't add
//                       a shown-then-waived fee back unless it's a real charge.
//   • total          — max(0, subtotal − couponDiscount − prepaidDiscount).
//                       THIS is what Razorpay charges.
//
// NOTE: since coupons are now validated live against Wix (/api/coupon), you no
// longer have to mirror every dashboard coupon here. Keep a tier only if you want
// it to drive the cart "unlock" nudge, or as an offline fallback for a headline
// code. Wix remains the authority on validity, expiry, minimums and per-buyer use.
// ============================================================================

/** Flat "pay online" discount. Stacks on any coupon. Not a Wix coupon. */
export const PREPAID_DISCOUNT = 50;

/** Luxury gift-wrap + handwritten note charge (₹). A real charge on the order. */
export const GIFT_WRAP_FEE = 149;

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
  /** Extra reward that comes with this step, shown beside the discount. */
  perk?: string;
}

// ---- Spend ladder ------------------------------------------------------------
// "Spend more, save more", applied AUTOMATICALLY in the bag (useAutoTierCoupon) —
// nobody types a code. Wix allows one coupon per order, so the steps never stack:
// the bag holds the best step the order qualifies for. Wix stays the authority
// (minimum, expiry, limits); if it rejects a step, the bag falls back a step.
//
// These MUST mirror coupons that exist in the Wix dashboard, codes matched
// case-insensitively. Owner-approved ladder 2026-09-16:
//
// OJAS10 — created in Wix on 2026-07-18: 10% off, minimum order subtotal ₹1,499
//          (two pieces).
// OJAS15 — TODO(owner): create in Wix — 15% off, minimum ₹2,499 (three pieces).
//          Until it exists Wix rejects it and 3-piece bags quietly get OJAS10.
//          FREE gift wrap at this step is a site rule, not part of the coupon —
//          see FREE_GIFT_WRAP_MINIMUM (re-checked server-side in /api/checkout).
// (AKSHAT30 — a Jul 27–Aug 10 2026 30%-off code — was removed after it expired.)
export const COUPON_TIERS: CouponTier[] = [
  {
    code: "OJAS10",
    type: "PERCENT",
    minimum: 1499,
    value: 0.1,
    label: "10% off orders over ₹1,499",
  },
  {
    code: "OJAS15",
    type: "PERCENT",
    minimum: 2499,
    value: 0.15,
    label: "15% off + FREE gift wrap on orders over ₹2,499",
    perk: "FREE gift wrap",
  },
];

/** Gift wrap is free once the order reaches the top ladder step. */
export const FREE_GIFT_WRAP_MINIMUM = COUPON_TIERS[COUPON_TIERS.length - 1].minimum;

/** What gift wrap costs on an order with this products subtotal (0 when free / not chosen). */
export const giftWrapFeeFor = (giftWrap: boolean, subtotal: number): number =>
  giftWrap && subtotal < FREE_GIFT_WRAP_MINIMUM ? GIFT_WRAP_FEE : 0;

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
  /** Optional gift-wrap charge (₹). A real charge — added on top of the total. */
  giftWrapFee?: number;
  /**
   * Sacred Bundle discount (₹) earned in the checkout upsell. Like the prepaid
   * −₹50 this is NOT a Wix coupon and STACKS on top of one; /api/checkout
   * reconciles it onto the order as a GLOBAL custom discount. See bundle.ts.
   */
  bundleDiscount?: number;
}

export interface Totals {
  subtotal: number;
  couponDiscount: number;
  prepaidDiscount: number;
  /** Sacred Bundle discount folded into the total (0 when none earned). */
  bundleDiscount: number;
  /** Gift-wrap charge folded into the total (0 when not selected). */
  giftWrapFee: number;
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
  giftWrapFee = 0,
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
  const wrap = Math.max(0, giftWrapFee);
  const total =
    Math.max(0, subtotal - couponDiscount - prepaidDiscount - bundle) + wrap;

  return {
    subtotal,
    couponDiscount,
    prepaidDiscount,
    bundleDiscount: bundle,
    giftWrapFee: wrap,
    total,
  };
};
