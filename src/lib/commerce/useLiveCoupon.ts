"use client";

// ============================================================================
// useLiveCoupon — the storefront's single coupon brain.
//
// It keeps the applied coupon's ₹ discount in sync with Wix's own engine, while
// never regressing the pre-existing local mirror (COUPON_TIERS in ./pricing):
//
//   • apply(code)  — validates a freshly typed code against Wix first; if Wix is
//                    unreachable it falls back to the mirror, so the two hardcoded
//                    codes keep working exactly as before.
//   • discount     — the ₹ to subtract for the CURRENT cart. Wix's value when it
//                    has answered for this exact cart; the mirror otherwise. It is
//                    recomputed as the cart/subtotal changes, so a % coupon stays
//                    correct when the upsell adds items (self-healing, as today).
//   • pending      — a validation is in flight; callers gate "Pay" on it so a
//                    stale number is never charged.
//   • auto-remove  — if Wix later rejects the applied code (expired, minimum no
//                    longer met, per-customer limit hit), the coupon is dropped
//                    and onAutoRemove(reason) fires so the UI can explain it.
//
// The applied code itself lives on the cart store (survives the cart → checkout
// hand-off + refresh); only the live Wix amount is tracked here.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useCartStore } from "@/lib/store/useCartStore";
import { cartSubtotal, evaluateCoupon } from "./pricing";

export interface CouponLine {
  id: string;
  name?: string;
  price: number;
  quantity: number;
  wixCatalogItemId?: string;
}

export interface ApplyResult {
  ok: boolean;
  /** Present when ok is false — a shopper-facing reason. */
  error?: string;
}

export interface LiveCoupon {
  /** ₹ to subtract from the subtotal for the current cart. */
  discount: number;
  /** True while a Wix validation is in flight (gate "Pay" on this). */
  pending: boolean;
  /** Wix when the amount came from Wix's engine, mirror when it's the fallback. */
  source: "wix" | "mirror";
  /** Validate + apply a freshly typed code. */
  apply: (rawCode: string) => Promise<ApplyResult>;
  /** True while apply() is running. */
  applying: boolean;
  /** Remove the applied coupon. */
  remove: () => void;
}

const signature = (code: string, lines: CouponLine[]) =>
  code
    ? `${code.toUpperCase()}#` +
      lines
        .map((l) => `${l.wixCatalogItemId || l.id}:${l.quantity}:${l.price}`)
        .join("|")
    : "";

const toPayloadLines = (lines: CouponLine[]) =>
  lines.map((l) => ({
    id: l.id,
    name: l.name,
    price: l.price,
    quantity: l.quantity,
    wixCatalogItemId: l.wixCatalogItemId,
  }));

type WixVerdict = {
  key: string;
  discount: number | null; // null → Wix unreachable, use mirror
  invalid: string | null; // reason string → Wix rejected the code
};

/**
 * Ask Wix what `code` is worth on these lines. Returns null on any transport
 * failure so the caller can fall back to the mirror.
 */
async function askWix(
  code: string,
  lines: CouponLine[],
  email?: string,
): Promise<{ ok: boolean; valid?: boolean; discount?: number; reason?: string } | null> {
  try {
    const res = await fetch("/api/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, lines: toPayloadLines(lines), email }),
    });
    return await res.json();
  } catch {
    return null;
  }
}

export function useLiveCoupon(
  lines: CouponLine[],
  email?: string,
  onAutoRemove?: (reason: string) => void,
): LiveCoupon {
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const setAppliedCoupon = useCartStore((s) => s.setAppliedCoupon);

  const subtotal = cartSubtotal(lines);
  const key = signature(appliedCoupon, lines);
  const mirrorDiscount = appliedCoupon
    ? evaluateCoupon(appliedCoupon, subtotal).discount
    : 0;

  const [verdict, setVerdict] = useState<WixVerdict>({
    key: "",
    discount: null,
    invalid: null,
  });
  const [applying, setApplying] = useState(false);
  const reqId = useRef(0);

  // `pending` is DERIVED, never set in an effect: a validation is outstanding
  // exactly while we hold a coupon whose current cart key we haven't heard back
  // on yet. Callers gate "Pay" on this, so a stale amount is never charged.
  const fresh = verdict.key === key;

  // Re-validate whenever the applied code or the priced cart changes. Debounced so
  // rapid changes (e.g. tapping quantity) collapse into one request. All state
  // writes happen inside the async callback — never synchronously in the effect.
  useEffect(() => {
    if (!appliedCoupon || fresh) return;
    let cancelled = false;
    const myReq = ++reqId.current;
    const t = setTimeout(async () => {
      const data = await askWix(appliedCoupon, lines, email);
      if (cancelled || myReq !== reqId.current) return;
      if (!data || !data.ok) {
        setVerdict({ key, discount: null, invalid: null }); // → mirror
      } else if (data.valid) {
        setVerdict({
          key,
          discount: Math.max(0, Math.round(Number(data.discount) || 0)),
          invalid: null,
        });
      } else {
        setVerdict({ key, discount: 0, invalid: data.reason || "invalid" });
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, appliedCoupon, email, fresh]);

  const pending = !!appliedCoupon && !fresh;
  useEffect(() => {
    if (appliedCoupon && fresh && verdict.invalid) {
      setAppliedCoupon("");
      onAutoRemove?.(verdict.invalid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh, verdict.invalid, appliedCoupon]);

  const apply = useCallback(
    async (rawCode: string): Promise<ApplyResult> => {
      const code = rawCode.trim();
      if (!code) return { ok: false, error: "Enter a coupon code." };
      setApplying(true);
      try {
        const data = await askWix(code, lines, email);
        // Wix answered.
        if (data && data.ok) {
          if (data.valid) {
            const upper = code.toUpperCase();
            setAppliedCoupon(upper);
            // Seed the verdict so the discount shows immediately (no flash).
            setVerdict({
              key: signature(upper, lines),
              discount: Math.max(0, Math.round(Number(data.discount) || 0)),
              invalid: null,
            });
            return { ok: true };
          }
          return { ok: false, error: "That code isn’t valid." };
        }
        // Wix unreachable → fall back to the local mirror (pre-existing behaviour).
        const { discount, error } = evaluateCoupon(code, subtotal);
        if (discount > 0) {
          const upper = code.toUpperCase();
          setAppliedCoupon(upper);
          setVerdict({ key: signature(upper, lines), discount: null, invalid: null });
          return { ok: true };
        }
        return { ok: false, error: error || "That code isn’t valid." };
      } finally {
        setApplying(false);
      }
    },
    [lines, email, subtotal, setAppliedCoupon],
  );

  const remove = useCallback(() => {
    setAppliedCoupon("");
    setVerdict({ key: "", discount: null, invalid: null });
  }, [setAppliedCoupon]);

  // Resolve the ₹ the shopper actually gets.
  let discount = mirrorDiscount;
  let source: "wix" | "mirror" = "mirror";
  if (appliedCoupon && fresh && verdict.discount !== null) {
    discount = verdict.discount;
    source = "wix";
  }

  return {
    discount: appliedCoupon ? discount : 0,
    pending: appliedCoupon ? pending : false,
    source,
    apply,
    applying,
    remove,
  };
}
