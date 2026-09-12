import Image from "next/image";

const INSTAGRAM_URL = "https://www.instagram.com/ojara.india";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

// Verified spiritual-lifestyle stills, laid out asymmetrically to mimic an
// Instagram feed. Spans only kick in at sm+ so mobile stays a clean 2-up grid.
const posts = [
  {
    id: "photo-1651841607023-9bc357ea63a2",
    alt: "A crystal point beside a candle on a quiet altar",
    span: "sm:col-span-2 sm:row-span-2",
  },
  {
    id: "photo-1658915294986-ecae46200c99",
    alt: "A candle and healing crystals on a linen flatlay",
    span: "",
  },
  {
    id: "photo-1618721025639-9affb7d96901",
    alt: "Sacred smudge smoke rising in a cleansing ritual",
    span: "sm:row-span-2",
  },
  {
    id: "photo-1652536160742-9f46c4a1a838",
    alt: "A blue evil eye amulet against a pale wall",
    span: "",
  },
  {
    id: "photo-1632980205460-e490e885e848",
    alt: "A glowing raw amethyst crystal cluster",
    span: "sm:col-span-2",
  },
];

const InstagramIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17.5 6.5h.01" />
  </svg>
);

export default function SocialProofGrid() {
  return (
    <section className="border-y border-champagne-gold/30 bg-ivory px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center sm:mb-14">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ojara on Instagram"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-champagne-gold transition-opacity hover:opacity-70"
          >
            <span className="text-champagne-gold">
              <InstagramIcon />
            </span>
            @ojara
          </a>
          <h2 className="mt-5 text-3xl uppercase tracking-[0.15em] text-midnight-navy sm:text-4xl">
            The Ojara Community
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-midnight-navy/70">
            Tag{" "}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-champagne-gold font-medium hover:underline"
            >
              @ojara
            </a>{" "}
            to see your ritual featured.
          </p>
        </div>

        <div className="grid auto-rows-[9rem] grid-cols-2 gap-3 overflow-hidden rounded-2xl border border-champagne-gold/30 sm:auto-rows-[11rem] sm:grid-cols-4 sm:gap-4 sm:border-0 sm:rounded-none">
          {posts.map((post) => (
            <a
              key={post.id}
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on Instagram"
              className={`cursor-pointer group relative overflow-hidden rounded-none bg-sand transition-all duration-150 active:scale-95 sm:rounded-xl ${post.span}`}
            >
              <Image
                src={img(post.id)}
                alt={post.alt}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              {/* Hover overlay with Instagram mark */}
              <div className="absolute inset-0 flex items-center justify-center bg-midnight-navy/0 text-champagne-gold opacity-0 transition-all duration-500 ease-out group-hover:bg-midnight-navy/55 group-hover:opacity-100">
                <InstagramIcon />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
