"use client";

import { useEffect, useRef } from "react";
import { PRODUCT_VIDEOS, productVideosHeading, type ProductVideo } from "@/lib/productVideos";

// A video only loads and plays while it's on screen — four autoplaying clips on
// a product page would otherwise cost every shopper the full download.
function VideoCard({ video }: { video: ProductVideo }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <figure className="relative aspect-[9/16] w-40 shrink-0 snap-start overflow-hidden rounded-xl bg-sand sm:w-48 md:w-auto">
      <video
        ref={ref}
        src={video.src}
        poster={video.poster}
        aria-label={video.alt}
        muted
        loop
        playsInline
        preload="none"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {video.caption && (
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-2 pt-6 text-[0.7rem] font-medium text-white">
          {video.caption}
        </figcaption>
      )}
    </figure>
  );
}

/** The reference PDP's customer-video row — placeholders from our reels for now (see lib/productVideos.ts). */
export default function ProductVideos() {
  if (PRODUCT_VIDEOS.length === 0) return null;
  const { eyebrow, title } = productVideosHeading();

  return (
    <section id="product-videos" aria-labelledby="product-videos-title" className="mt-8 scroll-mt-28">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-champagne-gold">{eyebrow}</p>
      <h2 id="product-videos-title" className="mt-1 font-heading text-2xl text-midnight-navy">
        {title}
      </h2>
      <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {PRODUCT_VIDEOS.map((video) => (
          <VideoCard key={video.src} video={video} />
        ))}
      </div>
    </section>
  );
}
