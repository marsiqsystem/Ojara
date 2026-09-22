"use client";

// ============================================================================
// useWixOffers — what Wix's AUTOMATIC offers (bracelet + ring 10%, buy 2 get 1)
// take off the current bag, straight from Wix (/api/offers).
//
//   • discounts — one line per offer Wix applies, with its ₹ amount.
//   • total     — their sum; subtract it from the subtotal (computeTotals).
//   • pending   — Wix hasn't answered for THIS bag yet. Callers gate "Pay" on
//                 it, so a prepaid payment always matches what Wix will charge.
//
// If Wix can't be reached, falls back to estimateOffers (./offers) so the bag
// still shows the saving the rules promise.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import type { CouponLine } from "./useLiveCoupon";
import { estimateOffers } from "./offers";

export interface OfferDiscount {
  name: string;
  amount: number;
}

export interface WixOffers {
  discounts: OfferDiscount[];
  total: number;
  pending: boolean;
}

const signature = (lines: CouponLine[]) =>
  lines.map((l) => `${l.wixCatalogItemId || l.id}:${l.quantity}:${l.price}`).join("|");

type Answer = { key: string; discounts: OfferDiscount[] };

export function useWixOffers(lines: CouponLine[]): WixOffers {
  const key = signature(lines);
  const [answer, setAnswer] = useState<Answer>({ key: "", discounts: [] });
  const reqId = useRef(0);
  const fresh = answer.key === key;

  useEffect(() => {
    if (!key || fresh) return;
    let cancelled = false;
    const myReq = ++reqId.current;
    const t = setTimeout(async () => {
      let discounts: OfferDiscount[];
      try {
        const res = await fetch("/api/offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines }),
        });
        const data = await res.json();
        if (!data?.ok || !Array.isArray(data.discounts)) throw new Error("no answer");
        discounts = data.discounts;
      } catch {
        const estimate = estimateOffers(lines.map((l) => ({ ...l, name: l.name ?? "" })));
        discounts = [
          ...(estimate.combo > 0 ? [{ name: "Bracelet + ring offer", amount: estimate.combo }] : []),
          ...(estimate.free > 0 ? [{ name: "Buy 2 Get 1 Free", amount: estimate.free }] : []),
        ];
      }
      if (cancelled || myReq !== reqId.current) return;
      setAnswer({ key, discounts });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fresh]);

  if (!key) return { discounts: [], total: 0, pending: false };
  // Until Wix answers for this bag, keep the previous answer's lines out: they
  // may no longer apply.
  const discounts = fresh ? answer.discounts : [];
  return {
    discounts,
    total: discounts.reduce((s, d) => s + d.amount, 0),
    pending: !fresh,
  };
}
