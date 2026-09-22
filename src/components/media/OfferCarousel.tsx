"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { bannerSet, type OfferArt } from "@/lib/media";

const ROTATE_MS = 5000;

function WideSlides({ banners, rounded }: { banners: OfferArt[]; rounded: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => window.clearInterval(t);
  }, [count, paused]);

  return (
    <div
      className={`group relative w-full overflow-hidden bg-midnight-navy ${rounded ? "rounded-2xl" : ""}`}
      style={{ aspectRatio: "1600 / 671" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null || count < 2) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) setIndex((i) => (i + (dx < 0 ? 1 : -1) + count) % count);
        touchX.current = null;
      }}
    >
      {banners.map((b, i) => (
        <Link
          key={b.id}
          href={b.href}
          aria-hidden={i !== index}
          tabIndex={i === index ? 0 : -1}
          className={`absolute inset-0 transition-opacity duration-700 ${i === index ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <Image
            src={b.src}
            alt={b.alt}
            fill
            sizes="(min-width: 1600px) 1600px, 100vw"
            className="object-cover"
          />
        </Link>
      ))}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous offer"
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-midnight-navy/70 text-champagne-gold opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next offer"
            onClick={() => setIndex((i) => (i + 1) % count)}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-midnight-navy/70 text-champagne-gold opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
          >
            ›
          </button>
          <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`Show offer ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 cursor-pointer rounded-full transition-all ${i === index ? "w-5 bg-champagne-gold" : "w-1.5 bg-ivory/60"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The owner's offer artwork as a contained, rounded slideshow — only offers the
 * bag honours right now (lib/media → allOffersLive), so a banner never promises
 * what checkout won't give. It sits inside the page gutters, after the first
 * products (owner, 2026-09-22: full-bleed straight under the hero looked off).
 */
export default function OfferCarousel({ className = "" }: { className?: string }) {
  const banners = bannerSet(4);
  if (banners.length === 0) return null;
  return (
    <section aria-label="Offers running now" className={className}>
      <WideSlides banners={banners} rounded />
    </section>
  );
}
