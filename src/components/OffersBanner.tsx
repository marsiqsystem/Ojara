"use client";

import Link from "next/link";
import { useCartStore, useCartHydrated } from "@/lib/store/useCartStore";
import { bagMix, liveOffers, nextOfferNudge } from "@/lib/commerce/offers";

/**
 * "Offers running now" on the home page — the owner's offer poster as cards:
 * WELCOME10, bracelet + ring 10%, ₹49 prepaid (once online payment is on) and
 * buy 2 get 1 (once Wix honours it). With a bag, it says exactly which piece
 * unlocks the next one.
 */
export default function OffersBanner() {
  const hydrated = useCartHydrated();
  const cartItems = useCartStore((s) => s.cartItems);
  const openCart = useCartStore((s) => s.openCart);
  const offers = liveOffers();

  const nudge = hydrated && cartItems.length > 0
    ? nextOfferNudge(
        bagMix(cartItems.map((ci) => ({ name: ci.product.name, price: ci.product.price, quantity: ci.quantity }))),
      )
    : null;

  return (
    <section aria-labelledby="offers-now" className="bg-midnight-navy px-4 sm:px-6 py-12 text-ivory sm:py-16">
      <div className="mx-auto max-w-[1600px]">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-champagne-gold">Applied in your bag</p>
        <h2 id="offers-now" className="mt-2 font-heading text-3xl text-champagne-gold sm:text-4xl">
          Offers running now
        </h2>
        <p className="mt-2 text-sm text-ivory/75">
          Every offer below is added for you — free delivery and Cash on Delivery on every order.
        </p>

        <ul
          className={`mt-6 grid gap-3 sm:gap-5 ${
            offers.length >= 4
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : offers.length === 3
                ? "sm:grid-cols-3"
                : "sm:grid-cols-2"
          }`}
        >
          {offers.map((o) => (
            <li key={o.key} className="flex flex-col rounded-2xl border border-champagne-gold/40 bg-ivory/5 p-4 sm:p-5">
              <p className="font-heading text-2xl leading-tight text-champagne-gold sm:text-3xl">{o.title}</p>
              <p className="mt-2 text-sm text-ivory/75">{o.detail}</p>
              {o.code && (
                <p className="mt-3 self-start rounded-md border border-dashed border-champagne-gold px-2.5 py-1 text-xs font-bold tracking-[0.2em] text-champagne-gold">
                  {o.code}
                </p>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap gap-3">
          {nudge ? (
            <button
              type="button"
              onClick={openCart}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-champagne-gold px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-midnight-navy"
            >
              {nudge.message} · View bag
            </button>
          ) : (
            <Link
              href="/collection"
              className="inline-flex items-center gap-2 rounded-full bg-champagne-gold px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-midnight-navy"
            >
              Shop now
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
