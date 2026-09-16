import Link from "next/link";
import FindYourStone from "@/components/FindYourStone";
import { getAllProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { COUPON_TIERS, tierPercent } from "@/lib/commerce/pricing";

// The first ladder step — the offer every visitor sees before they scroll.
const FIRST_TIER = COUPON_TIERS[0];

export default async function Hero() {
  // "From ₹X" off the live catalogue, so the price promise is always true.
  const inStock = (await getAllProducts()).filter((p) => p.stockCount > 0);
  const fromPrice = inStock.length ? Math.min(...inStock.map((p) => p.price)) : 0;

  return (
    // Shorter on phones (was 88vh) so the offer, the price and the first pieces
    // arrive sooner — the first screen should sell, not only set a mood.
    <section className="relative isolate flex min-h-[72vh] items-center justify-center overflow-hidden bg-midnight-navy sm:min-h-[88vh]">
      {/* Cinematic background video — rising incense smoke */}
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="https://images.unsplash.com/photo-1632980205460-e490e885e848?auto=format&fit=crop&w=1600&q=60"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source
          src="https://videos.pexels.com/video-files/35853514/15204260_1080_1920_30fps.mp4"
          type="video/mp4"
        />
      </video>

      {/* Overlay keeps the gold headline legible over the footage */}
      <div className="absolute inset-0 bg-midnight-navy/60" />

      <div className="relative z-10 mx-auto flex max-w-5xl animate-fade-in-up flex-col items-center px-6 py-16 text-center sm:py-32">
        {/* The live offer, before anything else. */}
        {FIRST_TIER && (
          <span className="mb-5 rounded-full border border-champagne-gold/60 bg-midnight-navy/60 px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-champagne-gold sm:mb-8 sm:text-xs">
            {tierPercent(FIRST_TIER)}% OFF on {formatPrice(FIRST_TIER.minimum)}+ · No code needed
          </span>
        )}

        {/* Was "Magnetic Healing & Crystals". The brand sells gemstone bracelets and
            claims no therapeutic effect — see BrandStory for the same correction. */}
        <h1 className="max-w-4xl text-4xl font-normal uppercase leading-[1.15] tracking-widest text-champagne-gold drop-shadow-[0_4px_10px_rgba(230,205,152,0.15)] sm:text-6xl md:text-7xl">
          Magnify Your Intentions
        </h1>

        <p className="mt-5 max-w-xl text-sm leading-7 tracking-wide text-ivory/85 sm:mt-8 sm:text-base sm:leading-8 md:text-lg">
          Handcrafted bracelets of natural gemstones — worn as a daily reminder of
          the intention you carry.
        </p>

        {fromPrice > 0 && (
          <p className="mt-4 text-sm font-semibold tracking-wide text-ivory">
            Bracelets from {formatPrice(fromPrice)} · Cash on Delivery · Free delivery
          </p>
        )}

        <div className="mt-8 flex flex-col items-center gap-4 sm:mt-12 sm:flex-row sm:gap-5">
          <Link
            href="#collection"
            className="cursor-pointer inline-flex items-center justify-center rounded-full border border-champagne-gold bg-champagne-gold px-8 py-3.5 text-xs font-normal uppercase tracking-[0.25em] text-midnight-navy transition-all duration-150 ease-out hover:bg-transparent hover:text-champagne-gold active:scale-95 sm:px-10 sm:text-sm"
          >
            Shop bracelets
          </Link>

          {/* Personalisation quiz — owns its own modal state */}
          <FindYourStone />
        </div>
      </div>
    </section>
  );
}
