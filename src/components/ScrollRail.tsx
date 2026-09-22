"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Horizontal scroll rail with two affordances that hint "this scrolls sideways":
//   1. A MARS-style dash indicator beneath — the active segment tracks scroll.
//   2. Small round arrows on the rail's inner edges on wide screens, that page
//      the rail along when clicked.
// Both hide when there's nothing to scroll. The arrows only appear from xl up.
// They used to sit in the side gutter outside the rail, but the page now runs
// nearly edge to edge (owner call 2026-09-21), so they overlay the first and
// last visible cards instead; on narrower screens swipe/dashes carry it.
//
// Server components can render their items straight into `children`; only this
// wrapper is client-side.
export default function ScrollRail({
  children,
  className = "",
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const [active, setActive] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  // Once the customer has actually scrolled, the mobile "Swipe" hint has done
  // its job and fades out.
  const [hasScrolled, setHasScrolled] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w > 0) setActive(Math.round(el.scrollLeft / w));
    const maxScroll = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= maxScroll - 1);
    if (el.scrollLeft > 8) setHasScrolled(true);
  }, []);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    // A hair of tolerance so sub-pixel widths don't fake an extra page.
    setPages(Math.max(1, Math.ceil((el.scrollWidth - 4) / w)));
    sync();
  }, [sync]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    measure();

    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [measure, sync]);

  const page = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const scrollable = pages > 1;

  return (
    <div>
      <div className="relative">
        <div
          ref={trackRef}
          aria-label={ariaLabel}
          className={`hide-scrollbar flex snap-x snap-mandatory overflow-x-auto ${className}`}
        >
          {children}
        </div>

        {/* Gutter arrows — wide screens only, and only toward a side that can
            still scroll. */}
        {scrollable && !atStart && (
          <ArrowButton
            direction="left"
            label="Scroll left"
            onClick={() => page(-1)}
          />
        )}
        {scrollable && !atEnd && (
          <ArrowButton
            direction="right"
            label="Scroll right"
            onClick={() => page(1)}
          />
        )}
      </div>

      {scrollable && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Scroll to group ${i + 1}`}
                onClick={() => {
                  const el = trackRef.current;
                  if (el) el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                  i === active
                    ? "w-7 bg-champagne-gold"
                    : "w-2.5 bg-midnight-navy/20 hover:bg-midnight-navy/40"
                }`}
              />
            ))}
          </div>

          {/* Mobile-only "Swipe" hint — fades once the customer has scrolled.
              Desktop gets the edge arrows instead. */}
          <span
            aria-hidden="true"
            className={`flex items-center gap-1 text-[0.7rem] uppercase tracking-[0.25em] text-champagne-gold transition-opacity duration-500 md:hidden ${
              hasScrolled ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            Swipe
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-swipe-hint"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      )}
    </div>
  );
}

function ArrowButton({
  direction,
  label,
  onClick,
}: {
  direction: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  const isRight = direction === "right";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-champagne-gold/40 bg-ivory/85 text-midnight-navy shadow-sm backdrop-blur-sm transition-all duration-200 ease-out hover:border-champagne-gold hover:bg-champagne-gold hover:text-midnight-navy active:scale-95 xl:flex ${
        isRight ? "right-2" : "left-2"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {isRight ? <path d="m9 6 6 6-6 6" /> : <path d="m15 6-6 6 6 6" />}
      </svg>
    </button>
  );
}
