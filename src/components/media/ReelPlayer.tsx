"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Reel } from "@/lib/media";
import type { Product } from "@/lib/mockData";
import { formatPrice } from "@/lib/format";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import AddToCartButton from "@/components/AddToCartButton";

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/**
 * Full-screen reel player shared by every reel on the site (rails, product
 * galleries, the floating reel). Opens with sound, pages through the set (arrows,
 * keys, or a swipe up/down), and keeps the piece in the reel on screen with one-tap
 * Add to bag — watching turns into buying without leaving the video.
 */
export default function ReelPlayer({
  reels,
  startIndex,
  shopFor,
  onClose,
  fallbackHref = "/collection",
}: {
  reels: Reel[];
  startIndex: number;
  /** The piece each reel sells, if any. */
  shopFor: (reel: Reel) => Product | undefined;
  onClose: () => void;
  /** Where general reels send the viewer. */
  fallbackHref?: string;
}) {
  const [index, setIndex] = useState(startIndex);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchY = useRef<number | null>(null);
  const reel = reels[index];
  const piece = reel ? shopFor(reel) : undefined;
  const many = reels.length > 1;
  const count = reels.length;

  const step = (by: number) => setIndex((i) => (i + by + count) % count);

  useEffect(() => {
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "ArrowDown") setIndex((i) => (i + 1) % count);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") setIndex((i) => (i - 1 + count) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, count]);

  if (!reel) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="OJARA reels"
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative aspect-[9/16] h-[min(88svh,calc((100vw-1.5rem)*16/9))] overflow-hidden rounded-2xl bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          touchY.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          if (touchY.current === null) return;
          const dy = e.changedTouches[0].clientY - touchY.current;
          if (many && Math.abs(dy) > 60) step(dy < 0 ? 1 : -1);
          touchY.current = null;
        }}
      >
        <video
          ref={videoRef}
          key={reel.src}
          src={reel.src}
          poster={reel.poster}
          aria-label={reel.alt}
          autoPlay
          loop
          playsInline
          muted={muted}
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            if (v.paused) v.play().catch(() => {});
            else v.pause();
          }}
          className="absolute inset-0 h-full w-full cursor-pointer object-cover"
        />

        {/* Top bar: sound, position, close */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent p-3">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Turn sound on" : "Mute"}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            {muted ? (
              <svg {...iconProps}>
                <path d="M11 5 6 9H2v6h4l5 4zM23 9l-6 6M17 9l6 6" />
              </svg>
            ) : (
              <svg {...iconProps}>
                <path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
              </svg>
            )}
          </button>
          {many && (
            <span className="text-xs font-medium tabular-nums text-white/85">
              {index + 1} / {count}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <svg {...iconProps}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {many && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous reel"
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/70"
            >
              <svg {...iconProps} width={20} height={20}>
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next reel"
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/70"
            >
              <svg {...iconProps} width={20} height={20}>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* Bottom: the piece in the reel, one tap to the bag. */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 pt-12">
          {piece ? (
            <div className="flex items-center gap-3 rounded-xl bg-ivory/95 p-2 shadow-lg">
              <Link
                href={`/product/${piece.id}`}
                onClick={onClose}
                className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-sand"
              >
                <Image src={piece.image} alt={piece.name} fill sizes="48px" className="object-cover" />
              </Link>
              <Link href={`/product/${piece.id}`} onClick={onClose} className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-midnight-navy">{piece.name}</span>
                <span className="text-xs text-midnight-navy/70">
                  <b className="text-midnight-navy">{formatPrice(piece.price)}</b>
                  {piece.originalPrice && piece.originalPrice > piece.price && (
                    <span className="ml-1.5 line-through opacity-60">{formatPrice(piece.originalPrice)}</span>
                  )}
                </span>
              </Link>
              <AddToCartButton
                product={piece}
                ariaLabel={`Add ${piece.name} to your bag`}
                onAdded={onClose}
                className="shrink-0 cursor-pointer rounded-full bg-midnight-navy px-3.5 py-2.5 text-[0.68rem] font-bold uppercase tracking-wider text-champagne-gold"
              >
                Add to bag
              </AddToCartButton>
            </div>
          ) : (
            <Link
              href={fallbackHref}
              onClick={onClose}
              className="block w-full rounded-full bg-champagne-gold py-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-midnight-navy hover:bg-champagne-gold/90"
            >
              Shop the collection
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
