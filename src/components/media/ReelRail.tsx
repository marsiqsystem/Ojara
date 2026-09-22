"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Reel } from "@/lib/media";
import type { Product } from "@/lib/mockData";
import { formatPrice } from "@/lib/format";
import ReelPlayer from "@/components/media/ReelPlayer";

// A card's video only loads and plays while it's on screen — a row of autoplaying
// clips would otherwise cost every shopper the full download.
function ReelCard({
  reel,
  piece,
  onOpen,
}: {
  reel: Reel;
  piece?: Product;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-[42vw] max-w-[220px] shrink-0 snap-start sm:w-48 lg:w-56 lg:max-w-none">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Watch: ${reel.title}`}
        className="group relative block aspect-[9/16] w-full cursor-pointer overflow-hidden rounded-xl bg-sand"
      >
        <video
          ref={ref}
          src={reel.src}
          poster={reel.poster}
          aria-hidden="true"
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-2.5 pb-2.5 pt-10 text-left">
          <span className="flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-[0.15em] text-champagne-gold">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 4v16l13-8z" />
            </svg>
            {reel.talking ? "Watch with sound" : "Watch"}
          </span>
          <span className="mt-1 line-clamp-2 block text-xs font-semibold leading-snug text-white">{reel.title}</span>
        </span>
      </button>
      {piece && (
        <Link
          href={`/product/${piece.id}`}
          className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-champagne-gold/40 bg-white px-2.5 py-1.5 text-[0.7rem] text-midnight-navy hover:border-champagne-gold"
        >
          <span className="min-w-0 truncate font-medium">{piece.name}</span>
          <span className="shrink-0 font-bold">{formatPrice(piece.price)}</span>
        </Link>
      )}
    </div>
  );
}

/**
 * A row of shoppable reels. Each card plays silently while on screen and names
 * the piece it shows; a tap opens the full player with sound and Add to bag.
 */
export default function ReelRail({
  reels,
  shop,
  eyebrow,
  title,
  subtitle,
  id,
  className = "",
  dark = false,
}: {
  reels: Reel[];
  /** reel id → the piece it sells (resolved on the server). */
  shop: Record<string, Product | undefined>;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  id?: string;
  className?: string;
  dark?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (reels.length === 0) return null;

  return (
    <section id={id} aria-label={title} className={`scroll-mt-28 ${className}`}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-champagne-gold">{eyebrow}</p>
      )}
      <h2 className={`mt-1 font-heading text-2xl sm:text-3xl ${dark ? "text-champagne-gold" : "text-midnight-navy"}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-1 text-sm ${dark ? "text-ivory/70" : "text-midnight-navy/60"}`}>{subtitle}</p>
      )}

      <div className="-mx-4 sm:-mx-6 mt-4 flex snap-x scroll-px-4 sm:scroll-px-6 gap-3 overflow-x-auto px-4 sm:px-6 pb-2 hide-scrollbar lg:mx-0 lg:scroll-px-0 lg:gap-4 lg:px-0">
        {reels.map((reel, i) => (
          <ReelCard key={reel.id} reel={reel} piece={shop[reel.id]} onOpen={() => setOpen(i)} />
        ))}
      </div>

      {open !== null && (
        <ReelPlayer
          reels={reels}
          startIndex={open}
          shopFor={(r) => shop[r.id]}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}
