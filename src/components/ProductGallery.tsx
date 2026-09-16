"use client";

import { useRef, useState } from "react";
import Image from "next/image";

type ProductGalleryProps = {
  images: string[];
  productName: string;
  /** Whole-number % off shown as a badge on the main image; 0 hides it. */
  discountPercent?: number;
};

export default function ProductGallery({
  images,
  productName,
  discountPercent = 0,
}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomStyle, setZoomStyle] = useState({});
  const [isZoomed, setIsZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const activeMedia = images[activeIndex];
  const isVideo = activeMedia && activeMedia.endsWith(".mp4");
  const hasMultiple = images.length > 1;

  const goTo = (index: number) => {
    const next = (index + images.length) % images.length;
    setActiveIndex(next);
    // Reset zoom whenever the frame changes so a zoomed transform doesn't carry over.
    setIsZoomed(false);
    setZoomStyle({ transform: "scale(1)" });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isVideo) return; // Disable zoom on video reels
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({ transformOrigin: `${x}% ${y}%`, transform: "scale(2)" });
  };

  // Mobile: horizontal swipe to page through images. A 40px threshold keeps a
  // tap from registering as a swipe.
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      goTo(delta < 0 ? activeIndex + 1 : activeIndex - 1);
    }
    touchStartX.current = null;
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Main Media Box */}
      <div
        className={`group relative w-full aspect-square bg-sand/30 overflow-hidden rounded-sm ${
          isVideo ? "cursor-default" : "lg:cursor-zoom-in"
        }`}
        onMouseEnter={() => !isVideo && setIsZoomed(true)}
        onMouseLeave={() => {
          setIsZoomed(false);
          setZoomStyle({ transform: "scale(1)" });
        }}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* object-contain, not object-cover: several of the Wix shots are taller
            infographics whose text ran off the top and bottom of this square box.
            Containing letterboxes them against bg-sand instead of cropping. */}
        {isVideo ? (
          <video
            src={activeMedia}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-contain"
          />
        ) : (
          <Image
            src={activeMedia}
            alt={`${productName} - View ${activeIndex + 1}`}
            fill
            className="object-contain transition-transform duration-200 ease-out"
            style={isZoomed ? zoomStyle : { transform: "scale(1)" }}
            priority
          />
        )}

        {/* Prev / Next arrows.
            Desktop: fade in on hover of the image.
            Mobile: always visible (no hover state), so touch users can page
            without relying on the swipe gesture alone. */}
        {hasMultiple && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => goTo(activeIndex - 1)}
              className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-midnight-navy/80 text-champagne-gold shadow-md backdrop-blur-sm transition-all duration-200 hover:bg-midnight-navy active:scale-90 lg:opacity-0 lg:group-hover:opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => goTo(activeIndex + 1)}
              className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-midnight-navy/80 text-champagne-gold shadow-md backdrop-blur-sm transition-all duration-200 hover:bg-midnight-navy active:scale-90 lg:opacity-0 lg:group-hover:opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* Discount badge — the real markdown from Wix's strikethrough price. */}
        {discountPercent > 0 && (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-midnight-navy px-3 py-1 text-xs font-bold text-champagne-gold shadow-md">
            {discountPercent}% OFF
          </span>
        )}

        {/* Badge counter */}
        <div className="absolute bottom-4 left-4 bg-midnight-navy text-champagne-gold text-xs font-semibold px-3 py-1 rounded-full shadow-md z-10">
          {activeIndex + 1} / {images.length}
        </div>

        {/* Dot indicators — a lightweight "you can swipe" affordance on mobile. */}
        {hasMultiple && (
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 lg:hidden">
            {images.map((_, idx) => (
              <span
                key={idx}
                aria-hidden="true"
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeIndex === idx ? "w-4 bg-champagne-gold" : "w-1.5 bg-ivory/70"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails. Centred under the main image, but the row still scrolls if a
          product ever carries more shots than fit. `w-max mx-auto` is what allows
          both: plain `justify-center` centres fine until the row overflows, at which
          point it pushes the first thumbnail past the scroll origin and it can never
          be reached. */}
      <div className="overflow-x-auto pb-2 hide-scrollbar">
        <div className="flex w-max mx-auto items-center gap-3">
        {images.map((img, idx) => {
          const isThumbVideo = img.endsWith(".mp4");
          return (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              aria-label={`View ${isThumbVideo ? "video reel" : `image ${idx + 1}`} of ${productName}`}
              className={`relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-sm overflow-hidden border-2 transition-all duration-300 ${
                activeIndex === idx
                  ? "border-champagne-gold opacity-100"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {isThumbVideo ? (
                <div className="relative w-full h-full bg-midnight-navy flex flex-col items-center justify-center text-champagne-gold">
                  <video
                    src={img}
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                  />
                  <span className="relative text-lg z-10">✦</span>
                  <span className="relative text-[9px] uppercase tracking-wider font-semibold z-10">Reel</span>
                </div>
              ) : (
                <Image
                  src={img}
                  alt={`${productName} — thumbnail ${idx + 1}`}
                  fill
                  className="object-cover"
                />
              )}
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}
