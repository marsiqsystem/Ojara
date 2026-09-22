import Image from "next/image";
import Link from "next/link";
import { COMBO_PERCENT, isOfferLive } from "@/lib/commerce/offers";
import { REELS, SQUARE_OFFERS } from "@/lib/media";
import InViewVideo from "@/components/media/InViewVideo";

/**
 * "Wear them together" — the bracelet + ring offer, shown the way it's worn: the
 * owner's lifestyle reel of stacked bracelets and rings next to the combo artwork,
 * with a way into each half of the pair. Sits right after the rings on the home
 * page, where a bracelet shopper first meets the rings.
 */
export default function ComboFeature() {
  if (!isOfferLive("combo")) return null;
  const reel = REELS.find((r) => r.id === "worn-together");
  const art = SQUARE_OFFERS.find((a) => a.id === "sq-combo");

  return (
    <section aria-labelledby="combo-feature" className="bg-sand/40 px-4 sm:px-6 py-14 sm:py-20">
      <div className="mx-auto grid max-w-[1600px] items-center gap-8 md:grid-cols-[1fr_1.1fr] lg:gap-14">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {reel && (
            <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-midnight-navy">
              <InViewVideo
                src={reel.preview}
                poster={reel.poster}
                label={reel.alt}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          )}
          {art && (
            <Link
              href={art.href}
              className="relative aspect-square self-center overflow-hidden rounded-2xl bg-midnight-navy shadow-lg"
            >
              <Image src={art.src} alt={art.alt} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
            </Link>
          )}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-champagne-gold">Better together</p>
          <h2 id="combo-feature" className="mt-3 font-heading text-3xl leading-tight text-midnight-navy sm:text-5xl">
            A bracelet and a ring, {COMBO_PERCENT}% off the ring
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-midnight-navy/75 sm:text-base">
            Pair any gemstone bracelet with any ring — {COMBO_PERCENT}% comes off the ring automatically in
            your bag. No code needed, and it stacks with your first-order discount.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/collection?type=rings"
              className="rounded-full bg-midnight-navy px-7 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-champagne-gold"
            >
              Shop rings
            </Link>
            <Link
              href="/collection?type=bracelets"
              className="rounded-full border border-midnight-navy px-7 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-midnight-navy"
            >
              Shop bracelets
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
