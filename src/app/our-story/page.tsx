import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import BackButton from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Our Story",
  alternates: { canonical: "/our-story" },
  description:
    "The meaning of Ojas, how our crystals are ethically sourced, and the intention behind OJARA.",
};

// Reuse image IDs already verified to resolve (HTTP 200) in the product catalogue.
const img = (id: string, w = 1400) =>
  id.startsWith("/") ? id : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

interface StoryBlock {
  eyebrow: string;
  heading: string;
  paragraphs: string[];
  image: string;
  alt: string;
}

const blocks: StoryBlock[] = [
  {
    eyebrow: "The Meaning",
    heading: "Rooted in Ojas",
    paragraphs: [
      "OJARA takes its name from Ojas — the ancient Sanskrit word for vital essence, the subtle energy said to be the foundation of vitality, radiance, and inner strength.",
      "We built this house around a single belief: that the objects we keep closest shape the energy we carry. A stone on your desk, a talisman by your door, a crystal held in the palm — small, deliberate anchors for the life you intend.",
    ],
    image: img("photo-1609216970141-d981d693484a"),
    alt: "A raw cluster of golden pyrite catching the light",
  },
  {
    eyebrow: "The Source",
    heading: "Ethically Unearthed",
    paragraphs: [
      "Every crystal begins deep in the earth, and we honour that origin. We work only with trusted partners who practise fair, responsible mining — protecting the land, the communities, and the hands that bring each stone to the surface.",
      "Nothing is mass-produced. Pieces are chosen one at a time for their clarity, colour, and quiet character, then authenticated before they ever reach our studio.",
    ],
    image: img("photo-1607772990885-48f6e4e4be3b"),
    alt: "Green jade coin carved with an abundance symbol",
  },
  {
    eyebrow: "The Ritual",
    heading: "Cleansed & Charged",
    paragraphs: [
      "Before a piece leaves us, it is cleared of residual energy and set with intention — through sage smoke, sound, and moonlight. It arrives not as a product, but as a companion ready to begin its work with you.",
      "This is the difference we obsess over: an object that feels held before it ever reaches your hands.",
    ],
    image: img("photo-1599858875300-3af12792e682"),
    alt: "A seven-chakra healing crystal tree by a window",
  },
  {
    eyebrow: "The Intention",
    heading: "For the Life You Intend",
    paragraphs: [
      "OJARA exists for the moment you decide to be deliberate — to attract abundance, to protect your peace, to sharpen your focus, to invite good fortune in.",
      "We don't promise magic. We craft beautiful, honest anchors for your intention, and trust you to do the rest.",
    ],
    image: img("photo-1647638162212-51180c35deae"),
    alt: "A cobalt evil-eye protection bracelet",
  },
];

export default function OurStoryPage() {
  return (
    <div className="bg-ivory">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={img("photo-1781579327044-da2da04b0a87", 1920)}
            alt="A golden Vastu turtle, emblem of fortune and stability"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-midnight-navy/70" />
        </div>
        {/* Back control, over the hero */}
        <div className="absolute left-0 top-0 z-10 w-full px-6 pt-6">
          <div className="mx-auto max-w-7xl">
            <BackButton fallbackHref="/" tone="light" />
          </div>
        </div>
        <div className="relative mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center px-6 py-28 text-center">
          <span className="text-xs uppercase tracking-[0.5em] text-champagne-gold">
            Our Story
          </span>
          <h1 className="mt-8 font-heading text-4xl leading-tight text-ivory sm:text-6xl">
            Energy, made tangible.
          </h1>
          <p className="mt-8 max-w-xl text-base leading-8 text-ivory/80">
            A quiet house of sacred objects — cleansed, charged, and crafted to
            magnify your intention.
          </p>
        </div>
      </section>

      {/* Alternating image / text blocks */}
      <div className="mx-auto max-w-7xl px-6">
        {blocks.map((block, index) => {
          const reversed = index % 2 === 1;
          return (
            <section
              key={block.heading}
              className="grid grid-cols-1 items-center gap-12 py-20 sm:py-28 lg:grid-cols-2 lg:gap-20"
            >
              <div className={reversed ? "lg:order-2" : "lg:order-1"}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-sand shadow-sm">
                  <Image
                    src={block.image}
                    alt={block.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 ease-out hover:scale-105"
                  />
                </div>
              </div>

              <div className={reversed ? "lg:order-1" : "lg:order-2"}>
                <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">
                  {block.eyebrow}
                </span>
                <h2 className="mt-5 font-heading text-3xl text-midnight-navy sm:text-4xl">
                  {block.heading}
                </h2>
                <div className="mt-6 space-y-5">
                  {block.paragraphs.map((paragraph, i) => (
                    <p
                      key={i}
                      className="text-base leading-8 text-midnight-navy/70"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Closing CTA */}
      <section className="border-t border-champagne-gold/20 bg-sand px-6 py-24 text-center">
        <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">
          Begin
        </span>
        <h2 className="mx-auto mt-6 max-w-2xl font-heading text-3xl text-midnight-navy sm:text-4xl">
          Find the piece that carries your intention.
        </h2>
        <Link
          href="/collection"
          prefetch
          className="mt-10 inline-flex rounded-full bg-midnight-navy px-12 py-4 text-xs font-medium uppercase tracking-[0.25em] text-champagne-gold transition-colors duration-300 ease-out hover:bg-midnight-navy/90"
        >
          Explore the Collection
        </Link>
      </section>
    </div>
  );
}
