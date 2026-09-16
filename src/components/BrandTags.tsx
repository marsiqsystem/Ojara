import type { ReactNode } from "react";

// The "brand tags" band (owner call, 2026-09-12): a thin trust strip spelling
// out the core promises the brand makes on every order. Since the sales rebuild
// it sits directly under the hero. Copy mirrors the AnnouncementBar
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
    // A slim trust strip directly under the hero (the Viora home order): the
    // promises that hold on every order, answered before the first product.
    <section aria-label="Why shop with OJARA" className="border-b border-champagne-gold/25 bg-ivory">
      <ul className="mx-auto flex max-w-7xl snap-x gap-6 overflow-x-auto px-6 py-4 hide-scrollbar md:justify-between">
        {tags.map((tag) => (
          <li key={tag.title} className="flex shrink-0 snap-start items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-champagne-gold/10 text-champagne-gold [&_svg]:h-5 [&_svg]:w-5">
              {tag.icon}
            </span>
            <span className="leading-tight">
              <span className="block text-[0.8rem] font-semibold text-midnight-navy">{tag.title}</span>
              <span className="block text-[0.7rem] text-midnight-navy/55">{tag.description}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
