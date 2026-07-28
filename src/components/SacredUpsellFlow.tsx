"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Confetti from "react-confetti";
import type { Product } from "@/lib/mockData";
import { formatPrice } from "@/lib/format";
import {
  BUNDLE_SLOTS,
  BUNDLE_TIERS,
  bundleDiscountFor,
  bundleRate,
  pickUpsellProducts,
  tierFor,
} from "@/lib/commerce/bundle";

// ---------------------------------------------------------------------------
// Sacred Upsell Flow — the gamified bundle step between "enter your email" and
// the delivery form.
//
// This component owns NO money. It reports its chosen items upward via
// onChange; CheckoutModal folds them into computeTotals(), and /api/checkout
// writes the discount onto the Wix order. See lib/commerce/bundle.ts.
// ---------------------------------------------------------------------------

const GOLD = "#D6AF7A";
const IVORY = "#F7F3EB";

// Meditating Buddha in Dhyana Mudra (hands folded in the lap) — a custom
// silhouette so we ship no extra icon dependency. `fill="currentColor"` lets the
// caller drive its colour with a text-* class, and its glow via a CSS filter.
// Head + shoulders that fold down into the lap + a wide crossed-leg base.
function BuddhaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {/* head */}
      <circle cx="12" cy="4.4" r="2.35" />
      {/* torso + arms curving into folded hands at the lap */}
      <path d="M12 7.1c-2.5 0-4.5 1.8-4.9 4.2l-.5 3.1c-.11.63.37 1.2 1.01 1.2h.86c.28-1.55 1.72-2.7 3.52-2.7s3.24 1.15 3.52 2.7h.86c.64 0 1.12-.57 1.01-1.2l-.5-3.1C16.5 8.9 14.5 7.1 12 7.1z" />
      {/* crossed legs — the wide seated base */}
      <path d="M12 14.1c-2.7 0-5 1.05-6.45 2.2-.72.57-.42 1.72.49 1.9 1.66.33 3.72.5 5.96.5s4.3-.17 5.96-.5c.91-.18 1.21-1.33.49-1.9C17 15.15 14.7 14.1 12 14.1z" />
    </svg>
  );
}

export interface SacredUpsellSelection {
  /** Upsell products the shopper accepted, in the order they added them. */
  items: Product[];
  /** Rupees off, already rounded. 0 when nothing was added. */
  discount: number;
}

export default function SacredUpsellFlow({
  primary,
  catalog,
  cartIds,
  onChange,
  onContinue,
}: {
  /** Highest-value item in the cart — what the suggestions are matched against. */
  primary: Product | undefined;
  /** Full product list, loaded by the parent from /api/products. */
  catalog: Product[];
  /** Product ids already in the cart, so we never upsell a duplicate. */
  cartIds: string[];
  /** Fires whenever the selection changes, so the parent can re-price. */
  onChange: (selection: SacredUpsellSelection) => void;
  /** Advance to the delivery step. */
  onContinue: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [added, setAdded] = useState<Product[]>([]);
  const [celebrating, setCelebrating] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const suggestions = useMemo(
    () => pickUpsellProducts(primary, catalog, cartIds),
    [primary, catalog, cartIds],
  );

  const count = added.length;
  const complete = count >= BUNDLE_SLOTS;
  const rate = bundleRate(count);
  const discount = bundleDiscountFor(added);
  const grossAdded = added.reduce((sum, p) => sum + p.price, 0);

  // Confetti needs real pixel dimensions; read them once the burst is armed.
  useEffect(() => {
    if (!celebrating) return;
    const measure = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    const timer = window.setTimeout(() => setCelebrating(false), 6000);
    return () => {
      window.removeEventListener("resize", measure);
      window.clearTimeout(timer);
    };
  }, [celebrating]);

  const addPiece = (product: Product) => {
    if (added.some((p) => p.id === product.id)) return;
    const next = [...added, product];
    setAdded(next);
    onChange({ items: next, discount: bundleDiscountFor(next) });
    if (next.length >= BUNDLE_SLOTS && !reduceMotion) setCelebrating(true);
  };

  const removePiece = (productId: string) => {
    const next = added.filter((p) => p.id !== productId);
    setAdded(next);
    onChange({ items: next, discount: bundleDiscountFor(next) });
  };

  const skip = () => {
    onChange({ items: added, discount });
    onContinue();
  };

  // Fill fraction of the rail: checkpoint 1 sits at 0%, checkpoint 3 at 100%.
  const progress = Math.min(1, count / BUNDLE_SLOTS);

  return (
    <div className="relative">
      {celebrating && viewport.width > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[60]">
          <Confetti
            width={viewport.width}
            height={viewport.height}
            colors={[GOLD, IVORY, "#EADCC5", "#FFFFFF"]}
            numberOfPieces={220}
            recycle={false}
            gravity={0.22}
            tweenDuration={6000}
          />
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Heading                                                           */}
      {/* ---------------------------------------------------------------- */}
      <div className="text-center">
        <span className="text-[0.65rem] uppercase tracking-[0.35em] text-champagne-gold">
          Before You Go
        </span>
        <h3 className="mt-3 font-heading text-2xl text-midnight-navy sm:text-3xl">
          Complete Your Chakra
        </h3>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-midnight-navy/60">
          Pieces chosen to sit alongside what you already carry. The more of the
          chakra you align, the deeper the harmony you carry home.
        </p>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Gamified progress rail                                            */}
      {/* ---------------------------------------------------------------- */}
      {/* Extra top room (pt-11) so the Buddha above the final node never    */}
      {/* collides with the subtext, on any width.                          */}
      <div className="mt-8 px-1 pt-11">
        <div className="relative h-1.5 rounded-full bg-midnight-navy/10">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-champagne-gold/70 to-champagne-gold"
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 120, damping: 20 }
            }
          />

          {/* "You are here" — rides the fill, pulsing until the ladder is done. */}
          <motion.div
            className="absolute top-1/2 z-10 -translate-y-1/2"
            initial={false}
            animate={{ left: `${progress * 100}%` }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 120, damping: 20 }
            }
            style={{ translateX: "-50%" }}
          >
            <span className="relative flex h-4 w-4 items-center justify-center">
              {!complete && !reduceMotion && (
                <motion.span
                  className="absolute inline-flex h-full w-full rounded-full bg-champagne-gold"
                  animate={{ opacity: [0.6, 0, 0.6], scale: [1, 2.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-ivory bg-champagne-gold shadow-[0_0_10px_rgba(214,175,122,0.9)]" />
            </span>
          </motion.div>

          {/* Checkpoints */}
          {BUNDLE_TIERS.map((tier, i) => {
            const reached = count >= tier.count;
            return (
              <div
                key={tier.count}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${((i + 1) / BUNDLE_SLOTS) * 100}%` }}
              >
                <span
                  className={`block h-2.5 w-2.5 rounded-full transition-colors duration-500 ${
                    reached
                      ? "bg-champagne-gold"
                      : "bg-midnight-navy/20"
                  }`}
                />
              </div>
            );
          })}

          {/* Final checkpoint — the meditating Buddha, sitting above the third
              node. Muted like a silhouette until the third piece lands; then it
              illuminates with a pulsing golden aura (see animation below). */}
          <motion.div
            className="pointer-events-none absolute bottom-full left-full z-20 mb-2 -translate-x-1/2"
            initial={false}
            animate={
              !complete
                ? { scale: 1, filter: "drop-shadow(0 0 0px rgba(214,175,122,0))" }
                : reduceMotion
                  ? { scale: 1, filter: "drop-shadow(0 0 10px rgba(214,175,122,0.8))" }
                  : {
                      scale: [1, 1.08, 1],
                      filter: [
                        "drop-shadow(0 0 2px rgba(214,175,122,0.2))",
                        "drop-shadow(0 0 13px rgba(214,175,122,0.9))",
                        "drop-shadow(0 0 6px rgba(214,175,122,0.5))",
                      ],
                    }
            }
            transition={
              complete && !reduceMotion
                ? { duration: 1.9, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.5, ease: "easeOut" }
            }
          >
            <BuddhaIcon
              className={`h-7 w-7 transition-[color,opacity] duration-700 sm:h-8 sm:w-8 ${
                complete
                  ? "text-champagne-gold opacity-100"
                  : "text-midnight-navy opacity-40 grayscale"
              }`}
            />
          </motion.div>
        </div>

        {/* Checkpoint labels */}
        <div className="mt-3 flex justify-between">
          {BUNDLE_TIERS.map((tier) => {
            const reached = count >= tier.count;
            return (
              <span
                key={tier.count}
                className={`text-[0.6rem] uppercase tracking-[0.18em] transition-colors duration-500 sm:text-[0.65rem] sm:tracking-[0.22em] ${
                  reached
                    ? "text-champagne-gold"
                    : "text-midnight-navy/35"
                }`}
              >
                {reached && "✦ "}
                {tier.label}
              </span>
            );
          })}
        </div>

        {/* Live nudge / unlocked state */}
        <div className="mt-4 min-h-[1.5rem] text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={count}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.28 }}
              className="text-xs text-midnight-navy/70 sm:text-sm"
            >
              {complete ? (
                <span className="text-champagne-gold">
                  ✦ Chakra aligned — 30% released on your added pieces
                </span>
              ) : (
                BUNDLE_TIERS[count]?.teaser
              )}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Suggestions                                                       */}
      {/* ---------------------------------------------------------------- */}
      <motion.div
        className="relative mt-7 rounded-2xl"
        animate={
          complete && !reduceMotion
            ? {
                boxShadow: [
                  "0 0 0px rgba(214,175,122,0)",
                  "0 0 34px rgba(214,175,122,0.55)",
                  "0 0 14px rgba(214,175,122,0.28)",
                ],
              }
            : { boxShadow: "0 0 0px rgba(214,175,122,0)" }
        }
        transition={{ duration: 1.4, ease: "easeOut" }}
      >
        {/* 3-across on every width — mobile matches desktop, just smaller, so
            the whole gamified flow stays on one screen instead of scrolling. */}
        <ul className="grid grid-cols-3 gap-2 sm:gap-4">
          {suggestions.map((product) => {
            const chosen = added.some((p) => p.id === product.id);
            const discounted = Math.round(product.price * (1 - rate));

            return (
              <li key={product.id}>
                <motion.div
                  animate={
                    chosen && !reduceMotion
                      ? { scale: [1, 1.03, 1] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 0.45 }}
                  className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-ivory transition-colors duration-500 ${
                    chosen
                      ? "border-champagne-gold shadow-[0_0_18px_rgba(214,175,122,0.35)]"
                      : "border-midnight-navy/10"
                  }`}
                >
                  <div className="relative aspect-square overflow-hidden bg-sand">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 33vw, 180px"
                      className="object-cover"
                    />
                    {chosen && (
                      <motion.span
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-champagne-gold text-[0.7rem] text-midnight-navy sm:right-2 sm:top-2 sm:h-6 sm:w-6"
                        aria-hidden="true"
                      >
                        ✦
                      </motion.span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-2 sm:p-3">
                    <h4 className="line-clamp-2 text-[0.68rem] leading-snug text-midnight-navy sm:text-sm">
                      {product.name}
                    </h4>

                    {/* Psychological pricing — the "was" is only shown once a
                        tier is actually unlocked, so we never strike through a
                        price the shopper isn't getting. */}
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0 sm:mt-2 sm:gap-x-2">
                      {rate > 0 && (
                        <span className="text-[0.6rem] text-midnight-navy/40 line-through sm:text-[0.7rem]">
                          {formatPrice(product.price)}
                        </span>
                      )}
                      <span className="text-xs font-bold text-champagne-gold sm:text-sm">
                        {formatPrice(rate > 0 ? discounted : product.price)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        chosen ? removePiece(product.id) : addPiece(product)
                      }
                      className={`mt-2 w-full rounded-full px-1.5 py-2 text-[0.52rem] uppercase leading-tight tracking-[0.08em] transition-colors duration-300 sm:mt-3 sm:px-3 sm:py-2.5 sm:text-[0.65rem] sm:tracking-[0.16em] ${
                        chosen
                          ? "border border-champagne-gold text-champagne-gold hover:bg-champagne-gold/10"
                          : "bg-champagne-gold text-midnight-navy hover:bg-champagne-gold/90"
                      }`}
                    >
                      {chosen ? "Remove" : "Add to My Chakra"}
                    </button>
                  </div>
                </motion.div>
              </li>
            );
          })}
        </ul>
      </motion.div>

      {/* ---------------------------------------------------------------- */}
      {/* Running bundle total                                              */}
      {/* ---------------------------------------------------------------- */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-6 rounded-xl border border-champagne-gold/30 bg-midnight-navy px-4 py-3">
              <div className="flex items-center justify-between text-xs text-ivory/70">
                <span className="uppercase tracking-[0.2em]">
                  {count} {count === 1 ? "piece" : "pieces"} added
                </span>
                <span>{tierFor(count)?.label} unlocked</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-sm text-ivory/60">Your chakra additions</span>
                <span className="flex items-baseline gap-2">
                  <span className="text-sm text-warm-grey line-through">
                    {formatPrice(grossAdded)}
                  </span>
                  <span className="text-lg font-bold text-champagne-gold">
                    {formatPrice(grossAdded - discount)}
                  </span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------------------- */}
      {/* Actions                                                           */}
      {/* ---------------------------------------------------------------- */}
      <div className="mt-7">
        <button
          type="button"
          onClick={skip}
          className="w-full rounded-full bg-midnight-navy px-6 py-4 text-xs uppercase tracking-[0.25em] text-champagne-gold transition-colors hover:bg-midnight-navy/90"
        >
          {complete
            ? "Complete my Chakra journey"
            : count > 0
              ? "Continue with my chakra"
              : "Continue to delivery"}
        </button>

        {!complete && (
          <p className="mt-3 text-center text-[0.7rem] text-midnight-navy/50">
            {count === BUNDLE_SLOTS - 1
              ? "Add the last piece to complete your chakra"
              : BUNDLE_TIERS[count]?.teaser}
          </p>
        )}

        <button
          type="button"
          onClick={skip}
          className="mt-4 w-full text-center text-[0.7rem] text-midnight-navy/45 underline underline-offset-4 transition-colors hover:text-midnight-navy/70"
        >
          Proceed to checkout with current energy
        </button>
      </div>
    </div>
  );
}
