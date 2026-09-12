import type { ReactNode } from "react";

// The "brand tags" band (owner call, 2026-09-12): a thin trust strip that sits
// between the Rings rail and the ValueProps grid, spelling out the core
// promises the brand makes on every order. Copy mirrors the AnnouncementBar
// (free pan-India shipping, COD, lab-certified) plus the 48-hour exchange window
// used across the shipping/returns pages.
interface BrandTag {
  title: string;
  description: string;
  icon: ReactNode;
}

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const tags: BrandTag[] = [
  {
    title: "Free Pan-India Shipping",
    description: "Delivered to your door, no extra charge.",
    icon: (
      <svg {...iconProps}>
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="17.5" cy="18" r="1.6" />
      </svg>
    ),
  },
  {
    title: "48-Hour Easy Exchange",
    description: "Changed your mind? Swap within 48 hours.",
    icon: (
      <svg {...iconProps}>
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
      </svg>
    ),
  },
  {
    title: "Cash on Delivery",
    description: "Pay when it reaches you — COD available.",
    icon: (
      <svg {...iconProps}>
        <rect x="2.5" y="6" width="19" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.6" />
        <path d="M6 9.5v5M18 9.5v5" />
      </svg>
    ),
  },
  {
    title: "100% Original & Lab-Certified",
    description: "Authentic natural crystals, verified.",
    icon: (
      <svg {...iconProps}>
        <path d="M12 3l7 3v5c0 4.2-2.9 7.6-7 8.7C7.9 18.6 5 15.2 5 11V6l7-3Z" />
        <path d="M9 11.5l2 2 4-4" />
      </svg>
    ),
  },
];

export default function BrandTags() {
  return (
    <section className="border-y border-champagne-gold/30 bg-ivory px-6 py-10 sm:py-12">
      {/* Mobile: a compact horizontal scroll rail (owner's standing rule — rails,
          not vertical stacks). Desktop: an even 4-up row with hairline dividers. */}
      <div className="mx-auto flex max-w-6xl snap-x snap-mandatory gap-4 overflow-x-auto hide-scrollbar -mx-6 px-6 sm:mx-auto sm:grid sm:grid-cols-4 sm:gap-px sm:overflow-hidden sm:rounded-2xl sm:border sm:border-champagne-gold/25 sm:bg-champagne-gold/25 sm:px-0">
        {tags.map((tag) => (
          <div
            key={tag.title}
            className="flex w-[62%] flex-shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-champagne-gold/25 bg-ivory px-5 py-6 text-center sm:w-auto sm:rounded-none sm:border-0 sm:px-6 sm:py-8"
          >
            <span className="text-champagne-gold">{tag.icon}</span>
            <h3 className="mt-1 text-[0.7rem] uppercase tracking-[0.15em] text-midnight-navy sm:text-xs sm:tracking-[0.18em]">
              {tag.title}
            </h3>
            <p className="max-w-[16rem] text-xs leading-5 text-midnight-navy/60">
              {tag.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
