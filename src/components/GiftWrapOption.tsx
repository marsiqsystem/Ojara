"use client";

import { useCartStore } from "@/lib/store/useCartStore";
import { formatPrice } from "@/lib/format";
import { GIFT_WRAP_FEE, giftWrapFeeFor } from "@/lib/commerce/pricing";
import { trackEvent } from "@/lib/analytics/capi";

/**
 * Gift wrap + handwritten note toggle, shared by the bag and checkout. The choice
 * lives on the cart store, so it carries between them and onto the order. Free
 * at the top ladder step (re-checked on the server).
 */
export default function GiftWrapOption({ subtotal }: { subtotal: number }) {
  const cartItems = useCartStore((s) => s.cartItems);
  const giftWrap = useCartStore((s) => s.giftWrap);
  const giftNote = useCartStore((s) => s.giftNote);
  const setGiftWrap = useCartStore((s) => s.setGiftWrap);
  const setGiftNote = useCartStore((s) => s.setGiftNote);
  const free = giftWrapFeeFor(true, subtotal) === 0;

  const toggle = () => {
    const next = !giftWrap;
    setGiftWrap(next);
    // Meta `CustomizeProduct` — opting into gift wrap + note. Only on enable, so
    // toggling off doesn't emit a spurious event.
    if (next) {
      trackEvent("CustomizeProduct", {
        customData: {
          currency: "INR",
          value: free ? 0 : GIFT_WRAP_FEE,
          content_name: "Luxury Gift Wrap & Note",
          content_ids: cartItems.map((i) => i.product.id),
          content_type: "product",
        },
      });
    }
  };

  return (
    <div className="rounded-xl border border-champagne-gold/30 bg-white/60 p-3">
      <button
        type="button"
        role="switch"
        aria-checked={giftWrap}
        onClick={toggle}
        className="flex w-full cursor-pointer items-center justify-between gap-4 text-left"
      >
        <span className="text-sm text-midnight-navy">
          <b>🎁 Gift wrap + handwritten note</b>{" "}
          {free ? (
            <span className="font-bold text-emerald-700">
              FREE <s className="font-normal text-midnight-navy/40">{formatPrice(GIFT_WRAP_FEE)}</s>
            </span>
          ) : (
            <span className="font-semibold text-champagne-gold">+{formatPrice(GIFT_WRAP_FEE)}</span>
          )}
        </span>
        <span
          aria-hidden="true"
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-300 ${
            giftWrap ? "bg-champagne-gold" : "bg-warm-grey/50"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-ivory shadow transition-transform duration-300 ${
              giftWrap ? "translate-x-[1.375rem]" : "translate-x-0.5"
            }`}
          />
        </span>
      </button>

      {giftWrap && (
        <label className="mt-3 block">
          <span className="sr-only">Your handwritten note</span>
          <textarea
            value={giftNote}
            onChange={(e) => setGiftNote(e.target.value)}
            rows={2}
            maxLength={240}
            placeholder="Your note — we'll handwrite it (optional)"
            className="w-full resize-none rounded-lg border border-midnight-navy/25 bg-white px-3 py-2 text-base text-midnight-navy placeholder:text-midnight-navy/45 focus:border-midnight-navy focus:outline-none focus:ring-1 focus:ring-midnight-navy"
          />
          <span className="block text-right text-[0.65rem] text-midnight-navy/55">
            {giftNote.length}/240
          </span>
        </label>
      )}
    </div>
  );
}
