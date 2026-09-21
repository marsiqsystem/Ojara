import Image from "next/image";
import Link from "next/link";

// COMBO OFFERS (owner call, 2026-09-12; artwork + Wix setup done 2026-09-21).
//
// All three offers use the owner's supplied artwork, each with its offer text
// baked in, so the cards no longer repeat it:
//   1. combo-bracelet-ring-10.png  — full-width  (bracelet + ring, 10% off)
//   2. buy2get1-bracelets.png      — two-up left (coupon B2G1FREE)
//   3. buy2get1-rings.png          — two-up right (coupon B2G1RINGS)
//
// Wix mechanisms (all live, verified 2026-09-21):
//   * Offer 1 is a Wix AUTOMATIC discount ("Combo Offer", 10% off Bracelets +
//     Rings, min 2 items) — no code to type, so this card shows no coupon chip.
//   * B2G1FREE and B2G1RINGS are "Buy X get Y free" coupons, both ACTIVE, and
//     validate at checkout via useLiveCoupon.

// Small coupon-code chip.
function CouponChip({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-champagne-gold/50 bg-champagne-gold/10 px-4 py-2 text-xs uppercase tracking-[0.15em] text-champagne-gold">
      Code: <span className="font-bold tracking-[0.2em]">{code}</span>
    </span>
  );
}

// "Shop the combo" pill.
function ShopButton() {
  return (
    <Link
      href="/collection"
      prefetch
      className="inline-flex items-center gap-2 rounded-full bg-champagne-gold px-6 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-midnight-navy shadow-sm transition-all duration-150 hover:bg-champagne-gold/85 active:scale-95"
    >
      Shop the Combo
      <span aria-hidden="true">→</span>
    </Link>
  );
}

export default function GiftingSection() {
  return (
    <section className="border-y border-champagne-gold/30 bg-midnight-navy text-ivory px-6 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 text-center sm:mb-12">
          <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">
            Combo Offers
          </span>
          <h2 className="mt-4 font-heading text-3xl uppercase tracking-[0.15em] text-champagne-gold sm:text-4xl">
            Bundle &amp; Save
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ivory/70">
            Pair your pieces and save — energized before dispatch and complete
            with a handwritten intention card.
          </p>
        </div>

        <div className="space-y-8">
          {/* Banner 1 — owner artwork (offer text baked in). */}
          <div>
            <Link
              href="/collection"
              prefetch
              aria-label="Buy a combo of one bracelet and a ring, get 10% off — shop the collection"
              className="group block overflow-hidden rounded-2xl border border-champagne-gold/25 shadow-lg shadow-black/25 transition-all duration-300 hover:border-champagne-gold/60"
            >
              <Image
                src="/combos/combo-bracelet-ring-10.png"
                alt="Buy a combo of one bracelet and a ring, get 10% off"
                width={1937}
                height={812}
                priority
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />
            </Link>
            {/* No coupon chip — the 10% is a Wix automatic discount, applied at
                checkout without a code. */}
            <div className="mt-4 flex justify-center">
              <ShopButton />
            </div>
          </div>

          {/* Row 2 — the two buy-2-get-1 artworks, side by side on desktop. */}
          <div className="grid gap-8 sm:grid-cols-2">
            {/* Buy 2 bracelets, get 1 free. */}
            <div>
              <Link
                href="/collection"
                prefetch
                aria-label="Buy 2 bracelets, get 1 free — shop the collection"
                className="group block overflow-hidden rounded-2xl border border-champagne-gold/25 shadow-lg shadow-black/25 transition-all duration-300 hover:border-champagne-gold/60"
              >
                <Image
                  src="/offers/buy2get1-bracelets.png"
                  alt="Buy 2 bracelets, get 1 free"
                  width={1080}
                  height={1080}
                  sizes="(max-width: 640px) 100vw, 620px"
                  className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                />
              </Link>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                <CouponChip code="B2G1FREE" />
                <ShopButton />
              </div>
            </div>

            {/* Buy 2 rings, get 1 free. */}
            <div>
              <Link
                href="/collection"
                prefetch
                aria-label="Buy 2 rings, get 1 free — shop the collection"
                className="group block overflow-hidden rounded-2xl border border-champagne-gold/25 shadow-lg shadow-black/25 transition-all duration-300 hover:border-champagne-gold/60"
              >
                <Image
                  src="/offers/buy2get1-rings.png"
                  alt="Buy 2 rings, get 1 free"
                  width={961}
                  height={812}
                  sizes="(max-width: 640px) 100vw, 620px"
                  className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                />
              </Link>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                {/* PLACEHOLDER code — owner must confirm the real ring-offer coupon. */}
                <CouponChip code="B2G1RINGS" />
                <ShopButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
