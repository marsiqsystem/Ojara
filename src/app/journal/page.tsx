import type { Metadata } from "next";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import JsonLd from "@/components/seo/JsonLd";
import { getAllJournalMeta } from "@/lib/journal";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "The OJARA Journal — guides to natural gemstone bracelets: how to tell real stones, cleansing and charging rituals, and what each stone is worn for.",
  alternates: { canonical: "/journal" },
  openGraph: {
    title: "Journal | OJARA",
    description:
      "Guides to natural gemstone bracelets — authenticity, care, and the meaning behind each stone.",
    url: "/journal",
    type: "website",
  },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function JournalIndexPage() {
  const posts = getAllJournalMeta();

  // CollectionPage + ItemList so the hub itself is a crawlable, structured entity.
  const listSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "OJARA Journal",
    url: absoluteUrl("/journal"),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
    hasPart: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: absoluteUrl(`/journal/${p.slug}`),
      datePublished: p.date,
    })),
  };

  return (
    <div className="bg-ivory">
      <JsonLd id="ld-journal-list" data={listSchema} />
      <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
        <BackButton fallbackHref="/" />

        <header className="mt-10 mb-14 text-center">
          <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">
            The Journal
          </span>
          <h1 className="mt-5 font-heading text-4xl text-midnight-navy sm:text-5xl">
            Stories, rituals & stone lore
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-midnight-navy/70">
            Guides to living with natural gemstone bracelets — how to tell a real
            stone, how to cleanse and charge your piece, and the meaning behind
            each one.
          </p>
        </header>

        <ul className="grid gap-8 sm:grid-cols-2">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/journal/${post.slug}`}
                prefetch
                className="group flex h-full flex-col rounded-2xl border border-champagne-gold/25 bg-sand/40 p-7 transition-colors duration-300 hover:border-champagne-gold/60"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-champagne-gold">
                  {formatDate(post.date)} &middot; {post.readingMinutes} min read
                </p>
                <h2 className="mt-3 font-heading text-2xl leading-snug text-midnight-navy">
                  {post.title}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-7 text-midnight-navy/75">
                  {post.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[0.2em] text-champagne-gold">
                  Read more
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    &rarr;
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
