"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  useCartStore,
  selectTotalPrice,
  useCartHydrated,
} from "@/lib/store/useCartStore";
import { formatPrice } from "@/lib/format";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import { PRIMARY_COUPON, GIFT_WRAP_FEE } from "@/lib/commerce/pricing";
import { useLiveCoupon, type CouponLine } from "@/lib/commerce/useLiveCoupon";
import { trackEvent } from "@/lib/analytics/capi";

export default function CartDrawer() {
  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const openCheckout = useCartStore((state) => state.openCheckout);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const cartItemsRaw = useCartStore((state) => state.cartItems);
  const totalPriceRaw = useCartStore(selectTotalPrice);

  // Guard against hydration mismatch: match the server's empty render first.
  const hydrated = useCartHydrated();
  const cartItems = hydrated ? cartItemsRaw : [];
  const totalPrice = hydrated ? totalPriceRaw : 0;

  // Luxury gift wrap + intention note upsell. Lives on the store so it carries
  // into checkout and onto the order.
  const giftWrap = useCartStore((s) => s.giftWrap);
  const giftNote = useCartStore((s) => s.giftNote);
  const setGiftWrap = useCartStore((s) => s.setGiftWrap);
  const setGiftNote = useCartStore((s) => s.setGiftNote);
  const giftWrapFee = giftWrap ? GIFT_WRAP_FEE : 0;

  // Coupon — validated LIVE against Wix's engine (with the local mirror as a
  // fallback if Wix is unreachable). The applied code lives on the store so
  // checkout + Wix pick it up; the ₹ amount is kept in sync by useLiveCoupon.
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState("");

  // The priced lines the coupon applies to (cart contents only — no upsell here).
  // Keyed off the raw store value + hydration flag so the memo deps stay stable.
  const couponLines = useMemo<CouponLine[]>(
    () =>
      (hydrated ? cartItemsRaw : []).map((ci) => ({
        id: ci.product.id,
        name: ci.product.name,
        price: ci.product.price,
        quantity: ci.quantity,
        wixCatalogItemId: ci.product.wixCatalogItemId,
      })),
    [hydrated, cartItemsRaw],
  );

  const {
    discount: couponDiscount,
    apply: applyCoupon,
    remove: removeCoupon,
  } = useLiveCoupon(couponLines, undefined, (reason) =>
    toast(
      reason === "empty" || reason === "no-priced-lines"
        ? "Coupon removed — your bag changed."
        : "That coupon is no longer valid for this order.",
    ),
  );
  const displayTotal = Math.max(0, totalPrice + giftWrapFee - couponDiscount);

  // Coupon unlock nudge — "Add ₹X more to save 10% with OJAS10". Flips to a
  // success line once the threshold is met. (Free shipping has no nudge — it's
  // free on every order.)
  const couponRemaining = Math.max(0, PRIMARY_COUPON.minimum - totalPrice);
  const couponUnlocked = totalPrice >= PRIMARY_COUPON.minimum;

  const applyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCode.trim();
    if (!code) return;
    const { ok, error } = await applyCoupon(code);
    if (ok) {
      setPromoError("");
      setPromoCode("");
      toast.success("✦ Coupon applied.");
    } else {
      setPromoError(error || "That code isn’t valid.");
    }
  };

  const removePromo = () => {
    removeCoupon();
    setPromoError("");
  };

  // Hand off to the real checkout modal (COD + Razorpay → Wix order + email).
  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    trackEvent("InitiateCheckout", {
      customData: {
        currency: "INR",
        value: displayTotal,
        num_items: cartItems.reduce((n, i) => n + i.quantity, 0),
        content_ids: cartItems.map((i) => i.product.id),
        content_type: "product",
      },
    });
    openCheckout();
  };

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!isCartOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onKeyDown);
    lockScroll();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
    };
  }, [isCartOpen, closeCart]);

  return (
    <>
      {/* Dark overlay — click to close */}
      <div
        aria-hidden={!isCartOpen}
        onClick={closeCart}
        className={`fixed inset-0 z-[9998] bg-midnight-navy/60 backdrop-blur-[2px] transition-opacity duration-300 ${
          isCartOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Sliding panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        className={`fixed right-0 top-0 z-[9999] flex h-full w-full max-w-md flex-col bg-ivory shadow-2xl transition-transform duration-300 ease-out ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-midnight-navy/20 px-6 py-5">
          <h2 className="font-heading text-xl uppercase tracking-[0.25em] text-midnight-navy font-bold">
            Your Bag
          </h2>
          <button
            type="button"
            aria-label="Close cart"
            onClick={closeCart}
            className="cursor-pointer rounded-full p-1 text-midnight-navy/70 transition-all duration-150 hover:text-midnight-navy active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Coupon unlock nudge — "Add ₹X more to save 10% with OJAS10". Flips to
            a success line once the threshold is met. No free-shipping bar: shipping
            is free on every order. This is a slim fixed band, so it doesn't eat
            into the items list. */}
        {cartItems.length > 0 && (
          <div className="border-b border-midnight-navy/10 px-6 py-3 bg-champagne-gold/5">
            <p className="text-center text-xs leading-5 tracking-wide text-midnight-navy/80 sm:text-sm">
              {couponUnlocked ? (
                <span className="font-semibold text-champagne-gold">
                  ✦ You&apos;ve unlocked 10% off — apply code{" "}
                  <span className="font-bold">{PRIMARY_COUPON.code}</span> below.
                </span>
              ) : (
                <>
                  Add{" "}
                  <span className="font-bold text-midnight-navy">
                    {formatPrice(couponRemaining)}
                  </span>{" "}
                  more to be eligible for{" "}
                  <span className="font-semibold text-champagne-gold">
                    {PRIMARY_COUPON.code}
                  </span>{" "}
                  — 10% off
                </>
              )}
            </p>
          </div>
        )}

        {/* Items rail. When the bag has items it sizes to its content and only
            scrolls once it runs out of room — so the footer hugs the last product
            instead of the list stretching to fill the drawer (which left a big
            empty gap under a single item). min-h-0 lets this flex child shrink so
            a tall footer can't push it past the point where it stops scrolling.
            Empty bag keeps flex-1 so the "your bag is empty" note stays centred. */}
        <div
          data-lenis-prevent
          className={`min-h-0 overflow-y-auto px-6 py-2 ${
            cartItems.length === 0 ? "flex-1" : "shrink"
          }`}
        >
          {cartItems.length === 0 ? (
            <div className="flex h-full flex-col justify-center">
              <div className="text-center">
                <p className="text-midnight-navy/70">Your bag is empty.</p>
                <p className="mt-2 text-sm text-warm-grey">
                  Add a piece to carry your intention.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-midnight-navy/10">
              {cartItems.map((item) => (
                <li key={item.product.id} className="flex gap-4 py-5 items-start">
                  {/* Premium, larger image frame */}
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-midnight-navy/10 bg-white">
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>

                  {/* Item metadata and interaction details */}
                  <div className="flex flex-1 flex-col h-full min-h-[96px] justify-between">
                    <div>
                      <div className="flex justify-between gap-2 items-start">
                        <h3 className="text-sm font-semibold text-midnight-navy line-clamp-2">
                          {item.product.name}
                        </h3>
                        <span className="text-sm font-bold text-midnight-navy flex-shrink-0">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[0.65rem] uppercase tracking-[0.2em] font-semibold text-champagne-gold">
                        ✦ {item.product.intention}
                      </p>
                    </div>

                    {/* Quantity selectors + sleek trash bin remove action */}
                    <div className="mt-3 flex items-center justify-between">
                      {/* Premium bordered numeric box */}
                      <div className="flex items-center rounded-lg border border-midnight-navy/20 bg-white/40 shadow-sm">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center text-midnight-navy/60 hover:text-midnight-navy active:scale-90 transition-transform font-medium"
                          aria-label="Decrease quantity"
                        >
                          —
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-midnight-navy select-none">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center text-midnight-navy/60 hover:text-midnight-navy active:scale-90 transition-transform font-medium"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      {/* Clean trash-can remove link */}
                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="flex items-center gap-1.5 cursor-pointer text-xs uppercase tracking-[0.1em] text-midnight-navy/60 hover:text-red-700 transition-colors py-1.5 px-2.5 rounded-md hover:bg-red-50/50 active:scale-95"
                        aria-label="Remove item"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                        </svg>
                        <span className="font-semibold text-[0.65rem] tracking-wider">Remove</span>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer with the upsells, pricing + checkout. Capped and scrollable so
            that when the gift-wrap note expands, the whole thing (toggle at the top
            through the ORDER NOW button) stays reachable instead of overflowing off
            the drawer with nowhere to scroll. */}
        {cartItems.length > 0 && (
          <div
            data-lenis-prevent
            className="max-h-[52vh] flex-shrink-0 overflow-y-auto border-t border-midnight-navy/15 px-6 py-4 bg-sand/15 shadow-[0_-8px_30px_rgba(0,0,0,0.03)] backdrop-blur-md"
          >
            {/* Luxury gift wrap + intention note upsells */}
            <div className="mb-3 border-b border-midnight-navy/10 pb-3">
              <button
                type="button"
                role="switch"
                aria-checked={giftWrap}
                onClick={() => {
                  const next = !giftWrap;
                  setGiftWrap(next);
                  // Meta `CustomizeProduct` — opting into luxury gift wrap + note.
                  // Only on enable, so toggling off doesn't emit a spurious event.
                  if (next) {
                    trackEvent("CustomizeProduct", {
                      customData: {
                        currency: "INR",
                        value: GIFT_WRAP_FEE,
                        content_name: "Luxury Gift Wrap & Note",
                        content_ids: cartItems.map((i) => i.product.id),
                        content_type: "product",
                      },
                    });
                  }
                }}
                className="flex w-full cursor-pointer items-center justify-between gap-4 text-left transition-all duration-150 active:scale-[0.99]"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-midnight-navy/85">
                  ✦ Add Luxury Gift Wrap &amp; Note{" "}
                  <span className="text-champagne-gold font-bold">
                    (+{formatPrice(GIFT_WRAP_FEE)})
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`relative h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-300 ease-out ${
                    giftWrap ? "bg-champagne-gold" : "bg-warm-grey/50"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-ivory shadow transition-transform duration-300 ease-out ${
                      giftWrap ? "translate-x-[1.375rem]" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>

              <div
                className={`grid transition-all duration-500 ease-out ${
                  giftWrap
                    ? "mt-4 grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <label className="block">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-midnight-navy/70">
                      Your handwritten note
                    </span>
                    <textarea
                      value={giftNote}
                      onChange={(e) => setGiftNote(e.target.value)}
                      rows={2}
                      maxLength={240}
                      placeholder="With love and light — may this carry your intention…"
                      className="mt-2 w-full resize-none rounded-md border border-midnight-navy/30 bg-white/40 px-4 py-3 text-sm leading-6 text-midnight-navy placeholder:text-midnight-navy/60 focus:outline-none focus:border-midnight-navy focus:ring-1 focus:ring-midnight-navy"
                    />
                    <span className="mt-1 block text-right text-[0.65rem] text-midnight-navy/60">
                      {giftNote.length}/240
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Offer code toggle */}
            <div className="mb-3 border-b border-midnight-navy/10 pb-3">
              <button
                type="button"
                onClick={() => setPromoOpen((v) => !v)}
                aria-expanded={promoOpen}
                className="flex w-full cursor-pointer items-center justify-between text-left transition-all duration-150 active:scale-[0.99]"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-midnight-navy/80">
                  Apply Offer Code
                </span>
                <span
                  aria-hidden="true"
                  className={`text-lg leading-none text-champagne-gold transition-transform duration-300 ease-out ${
                    promoOpen ? "rotate-45" : "rotate-0"
                  }`}
                >
                  +
                </span>
              </button>

              <div
                className={`grid transition-all duration-500 ease-out ${
                  promoOpen
                    ? "mt-4 grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  {appliedCoupon && couponDiscount > 0 ? (
                    <div className="flex items-center justify-between gap-2 rounded-md border border-champagne-gold/40 bg-champagne-gold/10 px-4 py-2.5">
                      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-champagne-gold">
                        ✦ {appliedCoupon} applied
                      </span>
                      <button
                        type="button"
                        onClick={removePromo}
                        className="flex-shrink-0 cursor-pointer text-xs uppercase tracking-[0.15em] text-midnight-navy/60 underline-offset-2 transition-colors hover:text-midnight-navy hover:underline active:scale-95"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <form onSubmit={applyPromo} className="flex gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value);
                            setPromoError("");
                          }}
                          placeholder="Enter code"
                          aria-label="Offer code"
                          className="flex-1 rounded-md border border-midnight-navy/30 bg-transparent px-4 py-2.5 text-xs uppercase tracking-[0.15em] text-midnight-navy placeholder:normal-case placeholder:tracking-normal placeholder:text-midnight-navy/60 focus:outline-none focus:border-midnight-navy focus:ring-1 focus:ring-midnight-navy"
                        />
                        <button
                          type="submit"
                          className="flex-shrink-0 cursor-pointer rounded-full bg-midnight-navy px-5 py-2 text-xs font-medium uppercase tracking-[0.2em] text-champagne-gold transition-all duration-150 hover:bg-midnight-navy/90 active:scale-95"
                        >
                          Apply
                        </button>
                      </form>
                      {promoError && (
                        <p className="mt-3 text-xs tracking-wide text-red-600">
                          {promoError}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing details */}
            <div className="space-y-1.5 pb-3">
              <div className="flex items-center justify-between text-xs text-midnight-navy/80">
                <span className="uppercase tracking-[0.15em]">Subtotal</span>
                <span className="font-bold">{formatPrice(totalPrice)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-midnight-navy/80">
                <span className="uppercase tracking-[0.15em]">Shipping</span>
                <span className="text-green-600 font-bold uppercase tracking-wider">FREE</span>
              </div>

              {giftWrap && (
                <div className="flex items-center justify-between text-xs text-midnight-navy/70">
                  <span className="uppercase tracking-[0.15em]">Gift wrap</span>
                  <span className="font-bold">+{formatPrice(GIFT_WRAP_FEE)}</span>
                </div>
              )}

              {couponDiscount > 0 && (
                <div className="flex items-center justify-between text-xs text-champagne-gold">
                  <span className="uppercase tracking-[0.15em]">
                    Coupon ({appliedCoupon})
                  </span>
                  <span className="font-bold">− {formatPrice(couponDiscount)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-midnight-navy/15 pt-3">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-midnight-navy/80">
                Total
              </span>
              <span className="text-2xl text-midnight-navy font-bold">
                {formatPrice(displayTotal)}
              </span>
            </div>

            {/* Premium, high-converting CTAs */}
            <button
              type="button"
              onClick={handleCheckout}
              className="mt-4 flex w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-midnight-navy text-champagne-gold px-8 py-4.5 text-xs font-bold uppercase tracking-[0.25em] transition-all duration-150 hover:bg-midnight-navy/90 active:scale-95 shadow-lg hover:shadow-xl"
            >
              ORDER NOW ⚡
            </button>
            <p className="mt-3.5 text-center text-[0.65rem] tracking-wide text-midnight-navy/60 font-semibold uppercase flex items-center justify-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Secure checkout · encrypted
            </p>
          </div>
        )}

      </aside>
    </>
  );
}
