import Image from "next/image";
import ScrollRail from "@/components/ScrollRail";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

// Reel-style gallery: portrait 9:16 cards holding either a looping video or a
// still. Videos are the intended format — swap a still's entry for
// `{ type: "video", src: "/reels/xyz.mp4", poster: img(...), alt: "…" }` and it
// plays inline, muted, looping, no other change needed.
//
// Two layouts share one ReelCard so both stay in sync:
//   • md+  : a 4-up grid that fills the row edge-to-edge (evenly spread, no
//            trailing gap).
//   • <md  : a horizontal scroll rail of portrait cards — swipe to move, it
//            never collapses into a 2×2 grid.
type Reel =
  | { type: "image"; src: string; alt: string }
  | { type: "video"; src: string; poster: string; alt: string };

const reels: Reel[] = [
  { type: "image", src: img("photo-1658915294986-ecae46200c99"), alt: "A candle and healing crystals on a linen flatlay" },
  { type: "image", src: img("photo-1618721025639-9affb7d96901"), alt: "Sacred smudge smoke rising in a cleansing ritual" },
  { type: "image", src: img("photo-1652536160742-9f46c4a1a838"), alt: "A blue evil eye amulet against a pale wall" },
  { type: "image", src: img("photo-1632980205460-e490e885e848"), alt: "A glowing raw amethyst crystal cluster" },
];

function ReelCard({ reel, className = "" }: { reel: Reel; className?: string }) {
  return (
    <figure
      className={`group relative aspect-[9/16] overflow-hidden rounded-xl bg-sand ${className}`}
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
          sizes="(max-width: 768px) 60vw, 260px"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
    </figure>
  );
}

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

        {/* Desktop: 4-up grid, evenly spread across the full width. */}
        <div className="hidden gap-4 md:grid md:grid-cols-4">
          {reels.map((reel, i) => (
            <ReelCard key={i} reel={reel} className="w-full" />
          ))}
        </div>

        {/* Mobile: horizontal scroll rail of portrait cards (sized by height so
            the next one peeks in and the row is obviously swipeable). */}
        <div className="md:hidden">
          <ScrollRail
            ariaLabel="Rituals and sacred energy reels"
            className="gap-3 pb-2"
          >
            {reels.map((reel, i) => (
              <ReelCard
                key={i}
                reel={reel}
                className="h-[56vh] shrink-0 snap-start"
              />
            ))}
          </ScrollRail>
        </div>
      </div>
    </section>
  );
}
