"use client";

import { useEffect } from "react";
import { useCartStore, useCartHydrated } from "@/lib/store/useCartStore";
import { COUPON_TIERS, bestTierFor, cartSubtotal, isTierCode } from "./pricing";

/**
 * The auto-applied codes it's honest to advertise right now: every one except
 * those Wix has refused this visit (e.g. WELCOME10 once a returning customer's
 * email shows they've used it).
 */
export function useAvailableTiers() {
  const unavailableTierCodes = useCartStore((s) => s.unavailableTierCodes);
  return COUPON_TIERS.filter((t) => !unavailableTierCodes.includes(t.code));
}

// ============================================================================
// useAutoTierCoupon — keeps WELCOME10 (COUPON_TIERS) on the bag, so nobody has
// to find or type it.
//
//   • applies the code as soon as the bag qualifies, drops it when it doesn't;
//   • never touches a code the shopper typed or removed (shopperChoseCoupon);
//   • skips codes Wix has refused this visit (markTierCodeUnavailable).
//
// It only sets the code. useLiveCoupon (bag + checkout) still validates it with
// Wix and prices it, so the discount shown is always Wix's. Mount ONCE — the
// always-mounted CartDrawer owns it.
// ============================================================================

/**
 * The `onAutoRemove` handler for useLiveCoupon, shared by the bag and checkout.
 * A code the bag applied that Wix then refuses isn't the shopper's mistake: note
 * it so it isn't re-applied. In the bag that happens silently. At checkout
 * (`explainAutoCode`) Wix knows the email, so a refusal almost always means the
 * one-per-customer welcome code was already used — say so, since the total rises.
 * A code the shopper chose gets the usual explanation.
 */
export function useCouponAutoRemoveHandler(
  notify: (message: string) => void,
  explainAutoCode = false,
) {
  const shopperChoseCoupon = useCartStore((s) => s.shopperChoseCoupon);
  const markTierCodeUnavailable = useCartStore((s) => s.markTierCodeUnavailable);

  return (reason: string, code: string) => {
    const bagChanged = reason === "empty" || reason === "no-priced-lines";
    if (!shopperChoseCoupon && isTierCode(code)) {
      if (!bagChanged) {
        markTierCodeUnavailable(code.toUpperCase());
        if (explainAutoCode) {
          notify(`${code.toUpperCase()} is for first orders only — it's been removed from this order.`);
        }
      }
      return;
    }
    notify(
      bagChanged
        ? "Coupon removed — your bag changed."
        : "That coupon is no longer valid for this order.",
    );
  };
}

export function useAutoTierCoupon() {
  const hydrated = useCartHydrated();
  const cartItems = useCartStore((s) => s.cartItems);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const shopperChoseCoupon = useCartStore((s) => s.shopperChoseCoupon);
  const unavailableTierCodes = useCartStore((s) => s.unavailableTierCodes);
  const setAppliedCoupon = useCartStore((s) => s.setAppliedCoupon);

  const subtotal = cartSubtotal(
    cartItems.map((ci) => ({ price: ci.product.price, quantity: ci.quantity })),
  );

  useEffect(() => {
    // Wait for the persisted bag, or an empty first render would clear a
    // restored code.
    if (!hydrated || shopperChoseCoupon) return;
    // A bag from the old spend ladder still holds OJAS10/OJAS15 — hand it over to
    // the current auto code. Any other non-auto code (typed by the shopper) stays.
    const legacyLadderCode = /^OJAS1[05]$/.test(appliedCoupon);
    if (appliedCoupon && !isTierCode(appliedCoupon) && !legacyLadderCode) return;

    const target = bestTierFor(subtotal, new Set(unavailableTierCodes))?.code ?? "";
    if (target !== appliedCoupon) setAppliedCoupon(target);
  }, [hydrated, subtotal, appliedCoupon, shopperChoseCoupon, unavailableTierCodes, setAppliedCoupon]);
}
