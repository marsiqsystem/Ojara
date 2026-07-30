"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getProductById, type Product } from "@/lib/mockData";
import { formatPrice } from "@/lib/format";
import { trackEvent } from "@/lib/analytics/capi";
import AddToCartButton from "@/components/AddToCartButton";

type Intention = "Wealth" | "Protection" | "Vitality" | "Focus";

// Intention -> the bracelet that carries it. One axis, because the catalogue is
// four bracelets that each own one intention: a second "what style?" question
// (raw stones / polished gems / amulets) described a range we no longer sell and
// pointed at products that no longer exist, so every answer 404'd.
const MATCHES: Record<Intention, string> = {
  Wealth: "citrine-bracelet",
  Protection: "black-tourmaline-evil-eye",
  Vitality: "carnelian-bracelet",
  Focus: "lapis-lazuli-bracelet",
};

const intentions: { value: Intention; caption: string }[] = [
  { value: "Wealth", caption: "Abundance, drive, prosperity" },
  { value: "Protection", caption: "Shield your aura, ward off envy" },
  { value: "Vitality", caption: "Energy, drive, inner fire" },
  { value: "Focus", caption: "Calm, clarity, grounded focus" },
];

export default function EnergyQuiz({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [intention, setIntention] = useState<Intention | null>(null);

  // Close on Escape while open. The background is deliberately NOT locked: the
  // owner wants scrolling over the dimmed area to move the page behind, while
  // scrolling over the dialog box scrolls the box (see data-lenis-prevent +
  // overscroll-contain on the box below).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const reset = () => {
    setStep(1);
    setIntention(null);
  };

  const chooseIntention = (value: Intention) => {
    setIntention(value);
    setStep(2);
    // Meta `Lead` — the shopper told us their intention and got a matched piece.
    // A qualified interest signal, distinct from an actual add-to-cart/purchase.
    const matched = getProductById(MATCHES[value]);
    trackEvent("Lead", {
      customData: {
        content_name: `Find Your Bracelet — ${value}`,
        content_category: value,
        ...(matched
          ? {
              currency: "INR",
              value: matched.price,
              content_ids: [matched.id],
              content_type: "product",
            }
          : {}),
      },
    });
  };

  const match: Product | undefined = intention
    ? getProductById(MATCHES[intention])
    : undefined;

  return (
    // The BOX is the scroll container: it caps at 85vh and scrolls its own
    // content, with data-lenis-prevent so the site's smooth-scroll doesn't
    // swallow the wheel and overscroll-contain so hitting the box's end doesn't
    // bleed into the page. The overlay itself doesn't scroll or lock, so a wheel
    // over the dimmed area falls through to Lenis and moves the page behind —
    // exactly the "inside scrolls the box, outside scrolls the site" behaviour.
    <div
      aria-hidden={!open}
      onClick={onClose}
      className={`fixed inset-0 z-[90] bg-midnight-navy/70 backdrop-blur-md transition-opacity duration-500 ease-out ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="flex min-h-full items-center justify-center px-6 py-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Find Your Bracelet quiz"
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent
        className={`relative max-h-[85vh] w-full max-w-lg overflow-y-auto overflow-x-hidden overscroll-contain rounded-3xl bg-ivory shadow-2xl transition-all duration-500 ease-out ${
          open ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"
        }`}
      >
        {/* Close */}
        <button
          type="button"
          aria-label="Close quiz"
          onClick={onClose}
          className="absolute right-5 top-5 z-10 cursor-pointer rounded-full p-1 text-midnight-navy/70 transition-all duration-150 hover:text-midnight-navy active:scale-95"
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

        {/* Body — natural height. The overlay above does the scrolling, so this
            never gets clipped no matter how short the screen is. */}
        <div>
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-8">
          {[1, 2].map((s) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                s === step
                  ? "w-8 bg-champagne-gold"
                  : s < step
                    ? "w-4 bg-champagne-gold/60"
                    : "w-4 bg-warm-grey/40"
              }`}
            />
          ))}
        </div>

        <div className="px-8 pb-10 pt-6 sm:px-10">
          <p className="text-center text-xs uppercase tracking-[0.4em] text-champagne-gold">
            Find Your Bracelet
          </p>

          {/* STEP 1 */}
          {step === 1 && (
            <QuizStep title="What are you manifesting?">
              {intentions.map((option) => (
                <QuizOption
                  key={option.value}
                  label={option.value}
                  caption={option.caption}
                  onClick={() => chooseIntention(option.value)}
                />
              ))}
            </QuizStep>
          )}

          {/* STEP 2 — result */}
          {step === 2 && match && (
            <div className="mt-8 text-center animate-fade-in-up">
              <h3 className="font-heading text-2xl text-midnight-navy sm:text-3xl">
                Your Perfect Match
              </h3>
              <p className="mt-2 text-sm text-midnight-navy/70">
                Worn daily, for {intention?.toLowerCase()}.
              </p>

              <div className="mx-auto mt-6 max-w-xs overflow-hidden rounded-2xl border border-champagne-gold/25 bg-sand/40">
                <div className="relative aspect-[4/5]">
                  <Image
                    src={match.image}
                    alt={match.name}
                    fill
                    sizes="320px"
                    className="object-cover"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-midnight-navy/90 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-champagne-gold backdrop-blur-sm">
                    {match.intention}
                  </span>
                </div>
                <div className="p-5">
                  <h4 className="font-heading text-lg text-midnight-navy">
                    {match.name}
                  </h4>
                  <p className="mt-1 text-sm text-midnight-navy/70">
                    {formatPrice(match.price)}
                  </p>
                </div>
              </div>

              <div className="mt-7">
                <AddToCartButton
                  product={match}
                  onAdded={onClose}
                  className="w-full cursor-pointer rounded-full bg-champagne-gold px-8 py-4 text-xs font-medium uppercase tracking-[0.25em] text-midnight-navy transition-all duration-150 hover:bg-champagne-gold/85 active:scale-95"
                >
                  Add to Bag
                </AddToCartButton>
              </div>

              <button
                type="button"
                onClick={reset}
                className="mt-5 cursor-pointer text-xs uppercase tracking-[0.2em] text-midnight-navy/70 transition-colors hover:text-midnight-navy active:scale-95"
              >
                ↺ Retake the quiz
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function QuizStep({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 animate-fade-in-up">
      <h3 className="text-center font-heading text-2xl text-midnight-navy sm:text-3xl">
        {title}
      </h3>
      <div className="mt-8 flex flex-col items-stretch gap-3">{children}</div>
    </div>
  );
}

function QuizOption({
  label,
  caption,
  onClick,
}: {
  label: string;
  caption: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-champagne-gold/25 bg-sand/40 px-6 py-5 text-left transition-all duration-150 hover:border-champagne-gold hover:bg-champagne-gold/15 active:scale-[0.98]"
    >
      <span>
        <span className="block font-heading text-lg tracking-wide text-midnight-navy">
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-midnight-navy/70">
          {caption}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="text-champagne-gold transition-transform duration-300 ease-out group-hover:translate-x-1"
      >
        →
      </span>
    </button>
  );
}
