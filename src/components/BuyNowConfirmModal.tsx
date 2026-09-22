"use client";

// ============================================================================
// Buy-Now confirmation modal (ported from Viora, re-themed for OJARA).
//
// The problem it solves: the cart is persisted (localStorage), so a shopper can
// return with an item still sitting in it. If they then hit "Buy Now" on a
// DIFFERENT product, the old item rides along to checkout and gets charged too.
// This modal intercepts that moment and lets them choose:
//   • "Yes, add to my order" — keep the other item(s) + the current one.
//   • "No, just buy this one" — drop the other item(s), buy only this.
//
// Everything here is OJARA-native: brand colours (midnight-navy / champagne-gold
// on ivory), rupee formatting via formatPrice(), and an offer nudge driven off
// the real automatic offers in commerce/offers.ts (bracelet + ring 10%, buy 2
// get 1) — so it only ever promises what the bag will apply.
// ============================================================================

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { formatPrice } from "@/lib/format";
import { estimateOffers } from "@/lib/commerce/offers";

export type AbandonedCartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  abandonedItems: AbandonedCartItem[];
  /** The item being bought now — its name tells a bracelet from a ring. */
  currentProduct: { name: string; price: number; quantity: number };
  // "yes" — keep the abandoned items + add the current product, then checkout.
  // "no"  — remove the abandoned items, buy only the current product.
  onDecision: (decision: "yes" | "no") => Promise<void> | void;
};

const BuyNowConfirmModal = ({
  open,
  onClose,
  abandonedItems,
  currentProduct,
  onDecision,
}: Props) => {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState<null | "yes" | "no">(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount flag for the portal (SSR guard)
  useEffect(() => setMounted(true), []);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Esc closes (unless a decision is in flight).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, busy]);

  // Offer nudge: does KEEPING the other items unlock an automatic offer the
  // current piece alone doesn't get (e.g. the bag's bracelet + this ring → 10%
  // off the ring)? Only a real, positive difference is shown.
  const couponNudge = useMemo(() => {
    const together = estimateOffers([...abandonedItems, currentProduct]).total;
    const alone = estimateOffers([currentProduct]).total;
    const saving = together - alone;
    if (saving <= 0) return null;
    return {
      saving,
      label: `Keep them and save ≈ ${formatPrice(saving)} — the offer applies automatically`,
    };
  }, [abandonedItems, currentProduct]);

  const handle = async (decision: "yes" | "no") => {
    if (busy) return;
    setBusy(decision);
    try {
      await onDecision(decision);
    } finally {
      setBusy(null);
    }
  };

  if (!mounted || !open) return null;

  const firstItemName = abandonedItems[0]?.name || "an item";
  const more = abandonedItems.length - 1;

  const modal = (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-midnight-navy/60 backdrop-blur-sm md:items-center"
      onClick={() => !busy && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Confirm Buy Now"
      data-lenis-prevent
    >
      <div
        className="relative w-full md:max-w-md max-h-[95vh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-ivory shadow-2xl ring-1 ring-champagne-gold/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-ivory border-b border-midnight-navy/10 px-5 py-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-midnight-navy tracking-wide">
            Just a quick check
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={!!busy}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-midnight-navy/60 hover:bg-sand/60 disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-midnight-navy/85 leading-relaxed">
            You already have{" "}
            <span className="font-semibold text-midnight-navy">
              {firstItemName}
              {more > 0 ? ` & ${more} more item${more > 1 ? "s" : ""}` : ""}
            </span>{" "}
            in your cart. Would you like to add them to this order too?
          </p>

          <div className="space-y-2 max-h-56 overflow-y-auto rounded-lg border border-midnight-navy/10 bg-sand/30 p-2">
            {abandonedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-md bg-ivory p-2 border border-midnight-navy/10"
              >
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-sand">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-midnight-navy">{item.name}</p>
                  <p className="text-xs text-midnight-navy/55">
                    Qty {item.quantity} · {formatPrice(item.price)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-midnight-navy">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          {couponNudge && (
            <div className="rounded-lg border border-champagne-gold/50 bg-champagne-gold/15 p-3 flex items-start gap-2">
              <svg
                className="w-5 h-5 text-champagne-gold flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-midnight-navy">{couponNudge.label}</p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={() => handle("yes")}
              disabled={!!busy}
              className="w-full rounded-full bg-champagne-gold py-3 text-xs font-bold uppercase tracking-wider text-midnight-navy shadow-lg transition-all duration-150 hover:bg-champagne-gold/85 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === "yes" ? "Adding…" : "Yes, add to my order"}
            </button>
            <button
              type="button"
              onClick={() => handle("no")}
              disabled={!!busy}
              className="w-full rounded-full border-2 border-midnight-navy py-3 text-xs font-bold uppercase tracking-wider text-midnight-navy transition-colors hover:bg-midnight-navy hover:text-ivory disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === "no" ? "Please wait…" : "No, just buy this one"}
            </button>
          </div>

          <p className="text-[11px] text-midnight-navy/55 text-center">
            Choosing &ldquo;No&rdquo; will remove the other item
            {abandonedItems.length > 1 ? "s" : ""} from your cart so only the item
            you&apos;re buying now is charged.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default BuyNowConfirmModal;
