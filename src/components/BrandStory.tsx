import Image from "next/image";

export default function BrandStory() {
  return (
    <section className="border-y border-champagne-gold/30 bg-midnight-navy text-ivory">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-0 lg:grid-cols-2">
        {/* Crystal image — a clean 1:1 crop, centered and contained, so the photo
            reads as composed instead of chopped by a tall stretched column, and
            the section stays short (owner call, 2026-09-12). */}
        <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="relative aspect-square w-full max-w-[20rem] overflow-hidden rounded-2xl sm:max-w-sm lg:max-w-md">
            <Image
              src="https://images.unsplash.com/photo-1651841607023-9bc357ea63a2?auto=format&fit=crop&w=1000&q=80"
              alt="A crystal point beside a candle on a quiet altar"
              fill
              priority
              sizes="(max-width: 1024px) 90vw, 28rem"
              className="object-cover"
            />
          </div>
        </div>

        {/* Editorial copy */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-14 sm:py-12 lg:px-20">
          <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">
            Our Philosophy
          </span>

          {/* Copy supplied by the client (2026-07-17). The previous version led on
              "The Essence of Ojas" and claimed therapeutic magnets stimulate blood
              circulation and balance the body's magnetic field — the brand sells
              gemstone bracelets and makes no such claim. */}
          <h2 className="mt-5 font-heading text-3xl uppercase leading-[1.3] tracking-[0.15em] sm:text-4xl sm:tracking-[0.2em]">
            More Than
            <br />
            An Accessory
          </h2>

          <div className="mt-6 space-y-4 text-base leading-7 text-ivory/90">
            <p>
              Our jewellery is designed to become more than an accessory. It
              becomes a personal ritual — a quiet reminder of your goals, a symbol
              of the energy you wish to invite into your life.
            </p>
            <p>
              Whether you&rsquo;re manifesting new opportunities, embracing
              self-growth, or simply drawn to the beauty of natural gemstones,{" "}
              <span className="text-champagne-gold">OJARA</span> creates timeless
              pieces that connect elegance with intention.
            </p>
            <p>
              Every crystal has a story. The next chapter is yours to write.
            </p>
          </div>

          <p className="mt-8 font-heading text-lg uppercase tracking-[0.35em] text-champagne-gold">
            Wear Your Intention
          </p>
        </div>
      </div>
    </section>
  );
}
