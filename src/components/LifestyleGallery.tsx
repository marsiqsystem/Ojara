import Image from "next/image";
import ScrollRail from "@/components/ScrollRail";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

// Reel-style rail: portrait 9:16 cards that hold either a looping video or a
// still. Videos are the intended format (owner is shooting them) — swap a
// still's entry for `{ type: "video", src: "/reels/xyz.mp4", poster: img(...) }`
// and it plays inline, muted, looping, no other change needed. The 9:16 frame
// and horizontal rail stay identical for both so the row never jumps.
type Reel =
  | { type: "image"; src: string; alt: string }
  | { type: "video"; src: string; poster: string; alt: string };

const reels: Reel[] = [
  { type: "image", src: img("photo-1658915294986-ecae46200c99"), alt: "A candle and healing crystals on a linen flatlay" },
  { type: "image", src: img("photo-1618721025639-9affb7d96901"), alt: "Sacred smudge smoke rising in a cleansing ritual" },
  { type: "image", src: img("photo-1652536160742-9f46c4a1a838"), alt: "A blue evil eye amulet against a pale wall" },
  { type: "image", src: img("photo-1632980205460-e490e885e848"), alt: "A glowing raw amethyst crystal cluster" },
];

export default function LifestyleGallery() {
  return (
    <section className="border-y border-champagne-gold/20 bg-ivory px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center sm:mb-14">
          <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">
            The Ritual
          </span>
          <h2 className="mt-5 text-3xl uppercase tracking-[0.15em] text-midnight-navy sm:text-4xl">
            Rituals &amp; Sacred Energy
          </h2>
        </div>

        <ScrollRail ariaLabel="Rituals and sacred energy reels" className="gap-3 pb-2 sm:gap-4">
          {reels.map((reel, i) => (
            <figure
              key={i}
              // Sized by HEIGHT, not width, so a 9:16 reel only takes part of
              // the screen — the heading above and the next reel peeking beside
              // it stay visible on a phone. Width follows from the aspect ratio.
              className="group relative aspect-[9/16] h-[44vh] shrink-0 snap-start overflow-hidden rounded-xl bg-sand sm:h-[56vh] md:h-[420px]"
            >
              {reel.type === "video" ? (
                <video
                  src={reel.src}
                  poster={reel.poster}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <Image
                  src={reel.src}
                  alt={reel.alt}
                  fill
                  sizes="(max-width: 768px) 60vw, 240px"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
            </figure>
          ))}
        </ScrollRail>
      </div>
    </section>
  );
}
