import type { ReactNode } from "react";

interface ValueProp {
  title: string;
  description: string;
  icon: ReactNode;
}

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 32,
  height: 32,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const values: ValueProp[] = [
  {
    title: "Handcrafted Excellence",
    description:
      "Each piece is set by hand in small batches, finished with the care of a single maker.",
    icon: (
      <svg {...iconProps}>
        <path d="M12 3 4 8v8l8 5 8-5V8l-8-5Z" />
        <path d="M12 3v18M4 8l8 5 8-5" />
      </svg>
    ),
  },
  {
    title: "Natural Gemstones",
    description:
      "Ethically sourced crystals, chosen for their clarity, colour, and quiet character.",
    icon: (
      <svg {...iconProps}>
        <path d="M6 3h12l3 6-9 12L3 9l3-6Z" />
        <path d="M3 9h18M9 3l3 18M15 3l-3 18" />
      </svg>
    ),
  },
  {
    title: "Meaningful Energy",
    description:
      "Every stone carries an intention — worn close, to hold what matters near.",
    icon: (
      <svg {...iconProps}>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        <circle cx="12" cy="12" r="3.2" />
      </svg>
    ),
  },
];

export default function ValueProps() {
  return (
    <section className="border-y border-champagne-gold/30 bg-sand px-4 sm:px-6 py-12 sm:py-24">
      {/* Mobile: a compact horizontal scroll rail — stacked vertically these three
          cards turned into a very long scroll. Desktop: the framed 3-up grid with
          hairline dividers (gap-px over a gold background). */}
      <div className="mx-auto flex max-w-[1600px] snap-x snap-mandatory gap-4 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-auto sm:grid sm:grid-cols-3 sm:gap-px sm:overflow-hidden sm:rounded-2xl sm:border sm:border-champagne-gold/30 sm:bg-champagne-gold/30 sm:px-0">
        {values.map((value) => (
          <div
            key={value.title}
            className="flex w-[70%] flex-shrink-0 snap-start flex-col items-center rounded-2xl border border-champagne-gold/30 bg-ivory px-4 py-8 text-center sm:w-auto sm:rounded-none sm:border-0 sm:px-8 sm:py-16"
          >
            <span className="text-champagne-gold">{value.icon}</span>
            <h3 className="mt-5 text-base uppercase tracking-[0.15em] text-midnight-navy sm:mt-8 sm:text-lg sm:tracking-[0.2em]">
              {value.title}
            </h3>
            <p className="mt-3 max-w-xs text-sm leading-6 text-midnight-navy/70 sm:mt-4 sm:leading-7">
              {value.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
