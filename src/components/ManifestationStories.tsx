import ScrollRail from "@/components/ScrollRail";

// Manifestation Stories — UGC social proof. Cinzel (font-heading) carries the
// quotes; Montserrat (font-sans) grounds the names. A horizontal swipe rail at
// every size, matching the other rails on the page (Categories, The Collection,
// Rituals) — the old build split into a mobile rail + a desktop CSS-columns
// masonry, which scrolled inconsistently.
interface Story {
  quote: string;
  name: string;
  location: string;
}

const stories: Story[] = [
  {
    quote:
      "The Pyrite cluster completely shifted the energy of my workspace. Abundance flows differently now.",
    name: "Amara O.",
    location: "Lagos",
  },
  {
    quote:
      "I hung the Evil Eye by my front door and, honestly, the house just feels lighter. Protected.",
    name: "Selin K.",
    location: "Istanbul",
  },
  {
    quote:
      "My Chakra tree sits by the window. Every morning it catches the light and I catch my breath.",
    name: "Priya N.",
    location: "London",
  },
  {
    quote:
      "The Tiger's Eye lives in my pocket now. On the hard days it steadies me before a single word is spoken.",
    name: "Marcus D.",
    location: "Brooklyn",
  },
  {
    quote:
      "I bought the Jade coin on a whim. Two weeks later the opportunity I'd been waiting on finally opened.",
    name: "Chloé R.",
    location: "Paris",
  },
  {
    quote:
      "It arrived already cleansed and wrapped like a gift. You can feel the intention before you even unbox it.",
    name: "Isabela M.",
    location: "Lisbon",
  },
];

export default function ManifestationStories() {
  return (
    <section id="stories" className="scroll-mt-24 border-y border-champagne-gold/30 bg-ivory px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">
            Manifestation Stories
          </span>
          <h2 className="mx-auto mt-6 max-w-2xl text-3xl uppercase tracking-[0.15em] text-midnight-navy sm:text-4xl">
            Energy, in their own words
          </h2>
        </div>

        {/* One horizontal swipe rail at every size, aligned to the section
            gutter, with the shared swipe indicator beneath. */}
        <div className="mt-14">
        <ScrollRail ariaLabel="Manifestation stories" className="items-stretch gap-5 pb-2 sm:gap-6">
          {stories.map((story) => (
            <figure
              key={story.name}
              className="flex w-[80%] shrink-0 snap-start flex-col rounded-2xl border border-champagne-gold/30 bg-sand/40 p-6 transition-all duration-500 ease-out hover:border-champagne-gold/50 hover:bg-sand/70 sm:w-[calc((100%-1.5rem)/2)] sm:p-8 lg:w-[calc((100%-2*1.5rem)/3)]"
            >
              <span
                aria-hidden="true"
                className="font-heading text-4xl leading-none text-champagne-gold"
              >
                &ldquo;
              </span>
              <blockquote className="mt-3 font-heading text-lg leading-8 text-midnight-navy">
                {story.quote}
              </blockquote>
              <figcaption className="mt-6 font-sans text-xs uppercase tracking-[0.25em] text-midnight-navy/85">
                {story.name}
                <span className="text-champagne-gold font-semibold"> · {story.location}</span>
              </figcaption>
            </figure>
          ))}
        </ScrollRail>
        </div>
      </div>
    </section>
  );
}
