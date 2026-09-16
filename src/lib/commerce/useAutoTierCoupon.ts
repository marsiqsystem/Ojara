"use client";

import { useEffect } from "react";
import { useCartStore, useCartHydrated } from "@/lib/store/useCartStore";
import { COUPON_TIERS, bestTierFor, cartSubtotal, isTierCode } from "./pricing";

/**
 * The ladder steps it's honest to advertise right now: every tier except those
 * Wix has refused this visit. A refused step (e.g. OJAS15 before it's created in
 * Wix) must not be shown as "unlocked" while the bag quietly holds the step below.
 */
export function useAvailableTiers() {
  const unavailableTierCodes = useCartStore((s) => s.unavailableTierCodes);
  return COUPON_TIERS.filter((t) => !unavailableTierCodes.includes(t.code));
}

// ============================================================================
// useAutoTierCoupon — keeps the best spend-ladder code on the bag, so nobody has
// to find or type OJAS10 / OJAS15.
//
//   • applies the highest step the bag qualifies for, upgrades as it grows, and
//     drops a ladder code the bag no longer reaches;
//   • never touches a code the shopper typed or removed (shopperChoseCoupon);
//   • skips codes Wix has refused this visit (markTierCodeUnavailable), so a step
//     that isn't set up in Wix falls back to the one below instead of erroring.
//
// It only sets the code. useLiveCoupon (bag + checkout) still validates it with
// Wix and prices it, so the discount shown is always Wix's. Mount ONCE — the
// always-mounted CartDrawer owns it.
// ============================================================================

/**
 * The `onAutoRemove` handler for useLiveCoupon, shared by the bag and checkout.
 * A ladder code the bag applied that Wix then refuses isn't the shopper's
 * mistake: note it (so the ladder steps down) and say nothing. Anything else —
 * a code the shopper chose — gets the usual explanation.
 */
export function useCouponAutoRemoveHandler(notify: (message: string) => void) {
  const shopperChoseCoupon = useCartStore((s) => s.shopperChoseCoupon);
  const markTierCodeUnavailable = useCartStore((s) => s.markTierCodeUnavailable);

  return (reason: string, code: string) => {
    const bagChanged = reason === "empty" || reason === "no-priced-lines";
    if (!shopperChoseCoupon && isTierCode(code)) {
      if (!bagChanged) markTierCodeUnavailable(code.toUpperCase());
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
    // A non-ladder code (e.g. a code the shopper typed before this existed) stays.
    if (appliedCoupon && !isTierCode(appliedCoupon)) return;

    const target = bestTierFor(subtotal, new Set(unavailableTierCodes))?.code ?? "";
    if (target !== appliedCoupon) setAppliedCoupon(target);
  }, [hydrated, subtotal, appliedCoupon, shopperChoseCoupon, unavailableTierCodes, setAppliedCoupon]);
}
