"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { productForReel, reelsForProduct, reelsForTags, type Reel } from "@/lib/media";
import { useCatalog } from "@/lib/commerce/useCatalog";
import ReelPlayer from "@/components/media/ReelPlayer";

// ============================================================================
// Floating reel — a small muted reel looping in the bottom-right corner of every
// page (owner ask 2026-09-21). Tap it for the full player with sound, the other
// reels, and Add to bag for the piece on screen; the × hides it for the visit.
//
// Page-aware (lib/media): on a product page it plays THAT piece's reels first
// (the Money Magnet page loops a Money Magnet reel); elsewhere the strongest
// creator reels. It mounts a moment after load so a clip never competes with the
// page's first paint, and sits under every drawer/modal (z-60).
// ============================================================================

const DISMISS_KEY = "ojara-reel-dismissed";
const START_DELAY_MS = 2500;

// Clear the other things pinned to the bottom of the screen:
//  • phones: offer strip + bottom nav (~96px)
//  • home: the Energy Guide chat bubble (bottom-right, home page only)
//  • product pages below lg: the sticky Buy Now bar
function positionFor(pathname: string) {
  if (pathname === "/") {
    return "bottom-[calc(164px+env(safe-area-inset-bottom))] md:bottom-[92px]";
  }
  if (pathname.startsWith("/product/")) {
    return "bottom-[calc(172px+env(safe-area-inset-bottom))] md:bottom-[96px] lg:bottom-6";
  }
  return "bottom-[calc(108px+env(safe-area-inset-bottom))] md:bottom-6";
}

/** Reels for this page. Product slugs carry the product's name words. */
function reelsFor(pathname: string): Reel[] {
  if (pathname.startsWith("/product/")) {
    const slugWords = decodeURIComponent(pathname.slice("/product/".length)).replace(/[-_]+/g, " ");
    const own = reelsForProduct(slugWords, 8);
    if (own.length) return own;
  }
  return reelsForTags(["wealth", "trust"], 8);
}

export default function FloatingReel() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  // The catalogue is only needed once the player opens (for Add to bag).
  const catalog = useCatalog(ready);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
      } catch {
        // Storage blocked — it simply shows again next page.
      }
      setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      setReady(true);
    }, START_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const close = useCallback(() => setExpanded(false), []);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Hidden for this page only.
    }
  };

  const reels = reelsFor(pathname);
  if (reels.length === 0 || pathname === "/success" || dismissed || !ready) return null;
  const reel = reels[0];

  return (
    <>
      {/* Mini player */}
      {!expanded && (
        <div className={`fixed right-3 z-[60] md:right-6 print:hidden ${positionFor(pathname)}`}>
          <div className="relative animate-fade-in-up">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label={`Watch: ${reel.title}`}
              className="group relative block aspect-[9/16] w-[84px] cursor-pointer overflow-hidden rounded-xl bg-midnight-navy shadow-xl ring-2 ring-champagne-gold/70 transition-transform duration-200 hover:scale-[1.03] md:w-[120px]"
            >
              <video
                key={reel.src}
                src={reel.src}
                poster={reel.poster}
                muted
                loop
                playsInline
                autoPlay={!reduceMotion}
                preload={reduceMotion ? "none" : "auto"}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent pb-1.5 pt-5 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-white md:text-[0.65rem]">
                <svg width={10} height={10} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 4v16l13-8z" />
                </svg>
                Watch
              </span>
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Hide the video"
              className="absolute -right-2 -top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-midnight-navy text-champagne-gold shadow-md ring-1 ring-champagne-gold/50 hover:bg-midnight-navy/90"
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <ReelPlayer
          reels={reels}
          startIndex={0}
          shopFor={(r) => productForReel(r, catalog)}
          onClose={close}
        />
      )}
    </>
  );
}
