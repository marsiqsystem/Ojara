"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  useCartStore,
  selectTotalPrice,
  useCartHydrated,
  type CartItem,
} from "@/lib/store/useCartStore";
import { formatPrice } from "@/lib/format";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import { isTierCode } from "@/lib/commerce/pricing";
import { estimateOffers, WELCOME_PERCENT, type OfferNudge } from "@/lib/commerce/offers";
import { LOW_STOCK_THRESHOLD, PREPAID_ENABLED } from "@/lib/commerce/config";
import { useLiveCoupon, type CouponLine } from "@/lib/commerce/useLiveCoupon";
import { useAutoTierCoupon, useCouponAutoRemoveHandler } from "@/lib/commerce/useAutoTierCoupon";
import { useWixOffers } from "@/lib/commerce/useWixOffers";
import { useUpsellSuggestions } from "@/lib/commerce/useUpsellSuggestions";
import { deliveryWindowLabel } from "@/lib/deliveryEstimate";
import OfferProgress from "@/components/OfferProgress";
import PairItWith from "@/components/PairItWith";

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

/**
 * The bag — rebuilt on the Viora pattern. Opened by every add-to-bag button.
 * Real savings up top, the running offers (WELCOME10 + Wix's automatic bracelet
 * + ring / buy 2 get 1, all applied by themselves), every piece with its
 * markdown and honest low stock, a warning before a removal costs an offer (plus
 * undo), the piece that unlocks the next offer, and one pinned checkout button
 * with the real total.
 */
export default function CartDrawer() {
  const isCartOpen = useCartStore((s) => s.isCartOpen);
  const closeCart = useCartStore((s) => s.closeCart);
  const openCheckout = useCartStore((s) => s.openCheckout);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const cartItemsRaw = useCartStore((s) => s.cartItems);
  const totalPriceRaw = useCartStore(selectTotalPrice);
  const lastAddedId = useCartStore((s) => s.lastAddedId);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const shopperChoseCoupon = useCartStore((s) => s.shopperChoseCoupon);
  const setShopperChoseCoupon = useCartStore((s) => s.setShopperChoseCoupon);

  // Guard against hydration mismatch: match the server's empty render first.
  const hydrated = useCartHydrated();
  const cartItems = hydrated ? cartItemsRaw : [];
  const subtotal = hydrated ? totalPriceRaw : 0;

  // WELCOME10 applies itself — this drawer is always mounted, so it owns the
  // auto-apply for the whole site.
  useAutoTierCoupon();

  const [confirmRemove, setConfirmRemove] = useState<{ id: string; losses: string[] } | null>(null);
  const [undo, setUndo] = useState<CartItem | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState("");

  // The priced lines the coupon applies to. Keyed off the raw store value +
  // hydration flag so the memo deps stay stable.
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
  } = useLiveCoupon(couponLines, undefined, useCouponAutoRemoveHandler(toast));
  // Bracelet + ring / buy 2 get 1 — Wix applies these itself, so ask Wix.
  const offers = useWixOffers(couponLines);

  // ---- Money: only real figures ------------------------------------------
  const total = Math.max(0, subtotal - offers.total - couponDiscount);
  // Markdown from Wix's strikethrough prices + the applied offer.
  const mrpSavings = cartItems.reduce(
    (sum, ci) =>
      sum + Math.max(0, (ci.product.originalPrice ?? ci.product.price) - ci.product.price) * ci.quantity,
    0,
  );
  const totalSavings = mrpSavings + offers.total + couponDiscount;
  const offerLines = cartItems.map((ci) => ({
    name: ci.product.name,
    price: ci.product.price,
    quantity: ci.quantity,
  }));
  const firstLowStock = cartItems.find(
    (ci) => ci.product.stockCount > 0 && ci.product.stockCount <= LOW_STOCK_THRESHOLD,
  );

  // A row of pieces for every offer within reach (more bracelets → one free, a
  // ring → 10% off it); relevant picks when none is.
  const { rails, picks } = useUpsellSuggestions({ bag: cartItems, limit: 6 });
  const scrollToRail = (n: OfferNudge) =>
    document.getElementById(`bag-rail-${n.offer}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // What a removal would cost — only real, computable losses: a free bracelet
  // or ring discount this piece keeps alive.
  const lossesIfRemoved = (ci: CartItem): string[] => {
    if (offers.discounts.length === 0) return [];
    const now = estimateOffers(offerLines);
    const after = estimateOffers(offerLines.filter((_, i) => cartItems[i].product.id !== ci.product.id));
    return [
      after.freeCount < now.freeCount
        ? `Your free bracelet — buy 2, get 1 free (${formatPrice(now.free - after.free)} off)`
        : "",
      after.comboCount < now.comboCount
        ? `10% off your ring — bracelet + ring offer (${formatPrice(now.combo - after.combo)} off)`
        : "",
    ].filter(Boolean);
  };

  const doRemove = (ci: CartItem) => {
    setConfirmRemove(null);
    removeItem(ci.product.id);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo(ci);
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  };

  const requestRemove = (ci: CartItem) => {
    const losses = lossesIfRemoved(ci);
    if (losses.length) setConfirmRemove({ id: ci.product.id, losses });
    else doRemove(ci);
  };

  const undoRemove = () => {
    if (!undo) return;
    addItem(undo.product);
    if (undo.quantity > 1) updateQuantity(undo.product.id, undo.quantity);
    setUndo(null);
  };

  const changeQuantity = (ci: CartItem, quantity: number) => {
    if (quantity < 1) return requestRemove(ci);
    updateQuantity(ci.product.id, Math.min(quantity, Math.max(1, ci.product.stockCount || quantity)));
  };

  const applyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCode.trim();
    if (!code) return;
    // A typed code is the shopper's choice — the bag stops auto-applying WELCOME10.
    setShopperChoseCoupon(true);
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
    setShopperChoseCoupon(true);
    removeCoupon();
    setPromoError("");
  };

  // Hand off to the checkout. InitiateCheckout is fired by CheckoutModal when it
  // opens — one IC per checkout, from one place.
  const handleCheckout = () => {
    if (cartItems.length === 0) return;
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

  const itemCount = cartItems.reduce((n, ci) => n + ci.quantity, 0);

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

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        inert={!isCartOpen}
        className={`fixed right-0 top-0 z-[9999] flex h-full w-full max-w-md flex-col bg-ivory shadow-2xl transition-transform duration-300 ease-out ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-midnight-navy/15 px-4 sm:px-6 py-4">
          <h2 className="font-heading text-xl font-bold uppercase tracking-[0.2em] text-midnight-navy">
            Your Bag{itemCount > 0 && <span className="ml-2 text-sm font-normal tracking-normal text-midnight-navy/60">({itemCount})</span>}
          </h2>
          <button
            type="button"
            aria-label="Close cart"
            onClick={closeCart}
            className="cursor-pointer rounded-full p-1 text-midnight-navy/70 transition-all duration-150 hover:text-midnight-navy active:scale-95"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {cartItems.length === 0 ? (
          // ---- Empty bag -----------------------------------------------------
          <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 py-8">
            <div className="text-center">
              <p className="text-4xl" aria-hidden="true">🛍️</p>
              <p className="mt-2 font-heading text-2xl text-midnight-navy">Your bag is empty</p>
              <p className="mt-1 text-sm text-midnight-navy/60">Pieces you add will show up here.</p>
              <Link
                href="/collection"
                onClick={closeCart}
                className="mt-5 inline-block rounded-full bg-midnight-navy px-7 py-3 text-xs font-bold uppercase tracking-[0.2em] text-champagne-gold"
              >
                Start shopping
              </Link>
            </div>
            <PairItWith
              items={picks}
              title="Popular right now"
              subtitle=""
              className="mt-10"
            />
          </div>
        ) : (
          <>
            <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {/* Real savings — markdown + the applied offer. */}
              {totalSavings > 0 && (
                <div className="bg-emerald-50 px-4 sm:px-6 py-2.5 text-center">
                  <p className="text-sm font-bold text-emerald-800">
                    🎉 You&apos;re saving {formatPrice(Math.round(totalSavings))}
                  </p>
                  {appliedCoupon && isTierCode(appliedCoupon) && !shopperChoseCoupon && couponDiscount > 0 && (
                    <p className="text-[0.7rem] font-medium text-emerald-700">
                      {WELCOME_PERCENT}% first-order discount ({appliedCoupon}) applied for you
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-5 px-4 sm:px-6 py-4">
                <OfferProgress
                  lines={offerLines}
                  offers={offers.discounts}
                  welcomeDiscount={appliedCoupon && isTierCode(appliedCoupon) ? couponDiscount : 0}
                  onNudge={scrollToRail}
                />

                {undo && (
                  <div role="status" className="flex items-center justify-between rounded-lg bg-midnight-navy px-3 py-2 text-xs text-ivory">
                    <span className="truncate">Removed {undo.product.name}</span>
                    <button type="button" onClick={undoRemove} className="ml-3 cursor-pointer font-bold uppercase tracking-wider text-champagne-gold">
                      Undo
                    </button>
                  </div>
                )}

                {/* Pieces */}
                <ul className="divide-y divide-midnight-navy/10">
                  {cartItems.map((ci) => {
                    const p = ci.product;
                    const justAdded = p.id === lastAddedId;
                    const lowStock = p.stockCount > 0 && p.stockCount <= LOW_STOCK_THRESHOLD;
                    return (
                      <li key={p.id} className={`py-4 ${justAdded ? "-mx-2 rounded-lg bg-emerald-50/70 px-2" : ""}`}>
                        <div className="flex gap-3">
                          <Link
                            href={`/product/${p.id}`}
                            onClick={closeCart}
                            className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-midnight-navy/10 bg-white"
                          >
                            <Image src={p.image} alt={p.name} fill sizes="80px" className="object-cover" />
                          </Link>
                          <div className="min-w-0 flex-1">
                            {justAdded && (
                              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-emerald-700">✓ Just added</p>
                            )}
                            <p className="line-clamp-2 text-sm font-medium text-midnight-navy">{p.name}</p>
                            <p className="mt-1 flex items-baseline gap-2">
                              <span className="text-sm font-bold text-midnight-navy">{formatPrice(p.price)}</span>
                              {p.originalPrice && p.originalPrice > p.price && (
                                <span className="text-xs text-midnight-navy/40 line-through">{formatPrice(p.originalPrice)}</span>
                              )}
                            </p>
                            {lowStock && (
                              <p className="mt-1 text-[0.7rem] font-semibold text-orange-600">⚠ Only {p.stockCount} left in stock</p>
                            )}
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex h-8 items-center rounded-lg border border-midnight-navy/20 bg-white">
                                <button
                                  type="button"
                                  onClick={() => changeQuantity(ci, ci.quantity - 1)}
                                  aria-label="Decrease quantity"
                                  className="h-full w-8 cursor-pointer text-midnight-navy"
                                >
                                  −
                                </button>
                                <span className="w-7 text-center text-sm font-semibold tabular-nums text-midnight-navy">{ci.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => changeQuantity(ci, ci.quantity + 1)}
                                  disabled={p.stockCount > 0 && ci.quantity >= p.stockCount}
                                  aria-label="Increase quantity"
                                  className="h-full w-8 cursor-pointer text-midnight-navy disabled:opacity-40"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => requestRemove(ci)}
                                className="cursor-pointer text-xs font-medium text-midnight-navy/55 underline underline-offset-2 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>

                        {confirmRemove?.id === p.id && (
                          <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                            <p className="font-semibold">Removing this means losing:</p>
                            <ul className="mt-1 list-disc pl-4">
                              {confirmRemove.losses.map((loss) => (
                                <li key={loss}>{loss}</li>
                              ))}
                            </ul>
                            <div className="mt-2.5 flex gap-2">
                              <button
                                type="button"
                                onClick={() => setConfirmRemove(null)}
                                className="flex-1 cursor-pointer rounded-full bg-midnight-navy py-2 text-[0.7rem] font-bold uppercase tracking-wider text-champagne-gold"
                              >
                                Keep it
                              </button>
                              <button
                                type="button"
                                onClick={() => doRemove(ci)}
                                className="flex-1 cursor-pointer rounded-full border border-red-300 py-2 text-[0.7rem] font-semibold uppercase tracking-wider text-red-700"
                              >
                                Remove anyway
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* A row per offer within reach, else relevant picks. */}
                {rails.length > 0 ? (
                  rails.map(({ nudge, products }) => (
                    <PairItWith
                      key={nudge.offer}
                      id={`bag-rail-${nudge.offer}`}
                      items={products}
                      title={nudge.message}
                      subtitle={
                        nudge.offer === "b2g1"
                          ? `${nudge.detail} Or tap + on a bracelet in your bag.`
                          : nudge.detail
                      }
                      className="scroll-mt-4"
                    />
                  ))
                ) : (
                  <PairItWith items={picks} title="Complete your ritual" subtitle="" className="" />
                )}

                {/* A separate code — offers already apply themselves. */}
                <div>
                  {appliedCoupon && couponDiscount > 0 ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                      <p className="min-w-0 truncate text-xs font-semibold text-emerald-800">
                        ✓ {appliedCoupon} applied
                        <span className="font-normal text-emerald-700"> · you save {formatPrice(couponDiscount)}</span>
                      </p>
                      <button type="button" onClick={removePromo} className="cursor-pointer text-[0.7rem] font-semibold uppercase tracking-wider text-red-600">
                        Remove
                      </button>
                    </div>
                  ) : !promoOpen ? (
                    <button
                      type="button"
                      onClick={() => setPromoOpen(true)}
                      className="cursor-pointer text-xs font-medium text-midnight-navy/60 underline underline-offset-2 hover:text-midnight-navy"
                    >
                      Have a different code?
                    </button>
                  ) : (
                    <>
                      <form onSubmit={applyPromo} className="flex gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value.toUpperCase());
                            setPromoError("");
                          }}
                          placeholder="ENTER CODE"
                          aria-label="Offer code"
                          autoFocus
                          className="min-w-0 flex-1 rounded-lg border border-midnight-navy/30 bg-white px-3 py-2 text-base uppercase tracking-wider text-midnight-navy focus:border-midnight-navy focus:outline-none focus:ring-1 focus:ring-midnight-navy"
                        />
                        <button type="submit" className="cursor-pointer rounded-full bg-midnight-navy px-4 text-[0.7rem] font-semibold uppercase tracking-wider text-champagne-gold">
                          Apply
                        </button>
                      </form>
                      {promoError && <p className="mt-1.5 text-xs text-red-600">{promoError}</p>}
                    </>
                  )}
                </div>

                {/* Price summary */}
                <div className="space-y-1.5 rounded-xl bg-sand/40 p-4 text-sm">
                  <div className="flex justify-between text-midnight-navy/75">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatPrice(subtotal)}</span>
                  </div>
                  {offers.discounts.map((o) => (
                    <div key={o.name} className="flex justify-between gap-2 font-medium text-emerald-700">
                      <span className="min-w-0">{o.name}</span>
                      <span className="shrink-0 tabular-nums">− {formatPrice(o.amount)}</span>
                    </div>
                  ))}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between font-medium text-emerald-700">
                      <span>{isTierCode(appliedCoupon) ? "First-order discount" : "Coupon"} ({appliedCoupon})</span>
                      <span className="tabular-nums">− {formatPrice(couponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-midnight-navy/75">
                    <span>Delivery</span>
                    <span className="font-semibold text-emerald-700">FREE</span>
                  </div>
                  <div className="flex justify-between border-t border-midnight-navy/15 pt-2 text-base font-bold text-midnight-navy">
                    <span>Total</span>
                    <span className="tabular-nums">{formatPrice(total)}</span>
                  </div>
                  <p className="border-t border-midnight-navy/10 pt-2 text-xs text-midnight-navy/65">
                    🚚 Order now, get it <b className="text-midnight-navy">{deliveryWindowLabel()}</b>
                  </p>
                </div>
              </div>
            </div>

            {/* Pinned checkout bar — the real total, always in reach. */}
            <div className="border-t border-midnight-navy/10 bg-ivory px-4 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-6px_16px_rgba(0,0,0,0.06)]">
              {firstLowStock && (
                <p className="mb-2 text-center text-[0.7rem] font-semibold text-orange-700">
                  ⚠ Only {firstLowStock.product.stockCount} left of {firstLowStock.product.name} — check out to get yours
                </p>
              )}
              <button
                type="button"
                onClick={handleCheckout}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-midnight-navy py-4 text-xs font-bold uppercase tracking-[0.2em] text-champagne-gold transition-all hover:bg-midnight-navy/90 active:scale-[0.98]"
              >
                <LockIcon />
                Checkout · {formatPrice(total)}
              </button>
              <p className="mt-2 text-center text-[0.68rem] text-midnight-navy/55">
                {PREPAID_ENABLED ? "UPI · Cards · Cash on Delivery" : "Cash on Delivery"} · Free delivery · 48-hr exchange
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
