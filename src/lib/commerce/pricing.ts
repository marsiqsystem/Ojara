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
//   • display optics  — shipping ₹99 + processing ₹50 are SHOWN then struck off,
//                       purely to make "FREE shipping / no fees" legible. They are
//                       folded into `displaySubtotal` and must NEVER be sent to
//                       Razorpay, the Wix order, or the confirmation email.
//   • total           — max(0, subtotal − couponDiscount − prepaidDiscount).
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

/** Shown-then-struck display fees. Pure optics — never charged. */
export const SHIPPING_FEE_DISPLAY = 99;
export const PROCESSING_FEE_DISPLAY = 50;

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

// These MUST mirror the coupons the owner has created in the Wix dashboard.
// Codes are matched case-insensitively. When live, Wix validates authoritatively;
// this mirror only drives the "add ₹X to unlock" nudge + the pre-apply preview.
//
// OJAS10   — created in Wix on 2026-07-18: 10% off, minimum order subtotal ₹1499.
// AKSHAT30 — created in Wix on 2026-07-27: 30% off, all products, no minimum,
//            valid Jul 27 – Aug 10 2026. Wix enforces the date window; this mirror
//            does not, so it may preview the discount after Aug 10 (Wix will then
//            reject it at apply-time). Remove this tier once the code expires.
export const COUPON_TIERS: CouponTier[] = [
  {
    code: "OJAS10",
    type: "PERCENT",
    minimum: 1499,
    value: 0.1,
    label: "10% off orders over ₹1499",
  },
  {
    code: "AKSHAT30",
    type: "PERCENT",
    minimum: 0,
    value: 0.3,
    label: "30% off any order",
  },
];

/** The coupon the storefront actively promotes (banner + cart unlock nudge). */
export const PRIMARY_COUPON = COUPON_TIERS[0];

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
  /** Optics only — inflated subtotal so shipping/processing can be struck off. */
  displaySubtotal: number;
  shippingFeeDisplay: number;
  processingFeeDisplay: number;
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
    // *** DISPLAY ONLY — never send to a gateway / order / email. ***
    displaySubtotal: subtotal + SHIPPING_FEE_DISPLAY + PROCESSING_FEE_DISPLAY,
    shippingFeeDisplay: SHIPPING_FEE_DISPLAY,
    processingFeeDisplay: PROCESSING_FEE_DISPLAY,
  };
};
