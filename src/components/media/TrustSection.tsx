import Image from "next/image";
import { REELS, TRUST_SQUARES } from "@/lib/media";
import InViewVideo from "@/components/media/InViewVideo";

/**
 * "Shop with confidence" — the last objections before a first order (is it real?
 * what if something's wrong?), answered with the owner's trust cards and the reel
 * of an order being packed with its authenticity certificate.
 */
export default function TrustSection() {
  const packing = REELS.find((r) => r.id === "packing");

  return (
    <section aria-labelledby="trust-title" className="px-4 sm:px-6 py-14 sm:py-20">
      <div className="mx-auto max-w-[1600px]">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-champagne-gold">Shop with confidence</p>
          <h2 id="trust-title" className="mt-3 font-heading text-3xl text-midnight-navy sm:text-4xl">
            Certified, packed with care, easy to exchange
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-midnight-navy/70">
            Every piece ships with its authenticity certificate. Pay on delivery, and if anything
            is wrong with your order, we exchange it.
          </p>
        </div>

        <div className="-mx-4 sm:-mx-6 mt-8 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 sm:px-6 pb-2 hide-scrollbar md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0">
          {packing && (
            <div className="relative aspect-square w-[72vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl bg-sand md:w-auto md:max-w-none">
              <InViewVideo
                src={packing.src}
                poster={packing.poster}
                label={packing.alt}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-sm font-semibold text-white">
                Packed with its certificate
              </span>
            </div>
          )}
          {TRUST_SQUARES.map((a) => (
            <div
              key={a.id}
              className="relative aspect-square w-[72vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl bg-sand md:w-auto md:max-w-none"
            >
              <Image src={a.src} alt={a.alt} fill sizes="(min-width: 768px) 33vw, 72vw" className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
