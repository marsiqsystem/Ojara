"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import { tierPercent } from "@/lib/commerce/pricing";
import { useAvailableTiers } from "@/lib/commerce/useAutoTierCoupon";

// The site's top offer bar. It used to be a marquee of one long run-on phrase —
// on a phone only fragments were ever readable, and it asked shoppers to type
// OJAS10. Now it shows ONE complete message at a time, and the ladder offers
// say "no code needed" because the bag applies them itself.
const ROTATE_MS = 4000;

const STANDING_MESSAGES = [
  "Free delivery across India · Cash on Delivery",
  "100% original lab-certified crystals",
];

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0);

  // Ladder steps Wix has refused drop out, as they do everywhere else.
  const messages = [
    ...useAvailableTiers().map(
      (t) =>
        `${tierPercent(t)}% OFF${t.perk ? ` + ${t.perk}` : ""} on ${formatPrice(t.minimum)}+ · no code needed`,
    ),
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
