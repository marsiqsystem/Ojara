"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { liveOffers } from "@/lib/commerce/offers";

// The site's top offer bar. It used to be a marquee of one long run-on phrase —
// on a phone only fragments were ever readable. Now it shows ONE complete
// message at a time: the offers actually running (lib/commerce/offers), then the
// standing promises.
const ROTATE_MS = 4000;

const STANDING_MESSAGES = [
  "Free delivery across India · Cash on Delivery",
  "100% original lab-certified crystals",
];

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0);

  const messages = [
    ...liveOffers().map((o) => (o.code ? `${o.title} · code ${o.code}` : o.title)),
    ...STANDING_MESSAGES,
  ];

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((i) => i + 1), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);

  const current = messages[index % messages.length];

  return (
    <div className="bg-champagne-gold text-midnight-navy">
      <Link
        href="/collection"
        aria-label={messages.join(". ")}
        className="flex h-9 items-center justify-center px-4 text-center text-[0.7rem] font-semibold uppercase tracking-[0.15em] sm:text-xs"
      >
        <span key={current} aria-hidden="true" className="truncate motion-safe:animate-fade-in">
          {current}
        </span>
      </Link>
    </div>
  );
}
