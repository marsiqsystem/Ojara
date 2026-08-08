import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import BackButton from "@/components/BackButton";
import JsonLd from "@/components/seo/JsonLd";
import {
  getJournalPost,
  getJournalSlugs,
  getAllJournalMeta,
} from "@/lib/journal";
import { blogPostingSchema, breadcrumbSchema } from "@/lib/seo";

export function generateStaticParams() {
  return getJournalSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getJournalPost(slug);
  if (!post) return {};

  const url = `/journal/${slug}`;
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: `${post.title} | OJARA`,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updated || post.date,
      ...(post.image ? { images: [{ url: post.image, alt: post.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | OJARA`,
      description: post.description,
    },
  };
}

// Brand-styled renderers for the MDX body — matches the site's ivory/navy/gold
// palette without pulling in a typography plugin.
const mdxComponents = {
  h2: (props: React.ComponentProps<"h2">) => (
    <h2
      className="mt-12 mb-4 font-heading text-2xl text-midnight-navy sm:text-3xl"
      {...props}
    />
  ),
  h3: (props: React.ComponentProps<"h3">) => (
    <h3
      className="mt-8 mb-3 font-heading text-xl text-midnight-navy"
      {...props}
    />
  ),
  p: (props: React.ComponentProps<"p">) => (
    <p className="mt-5 text-base leading-8 text-midnight-navy/85" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="mt-5 space-y-2 pl-1" {...props} />
  ),
  li: (props: React.ComponentProps<"li">) => (
    <li
      className="flex gap-3 text-base leading-8 text-midnight-navy/85 before:mt-3 before:h-1.5 before:w-1.5 before:flex-shrink-0 before:rounded-full before:bg-champagne-gold"
      {...props}
    />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a
      className="text-champagne-gold underline-offset-4 hover:underline"
      {...props}
    />
  ),
  strong: (props: React.ComponentProps<"strong">) => (
    <strong className="font-semibold text-midnight-navy" {...props} />
  ),
  blockquote: (props: React.ComponentProps<"blockquote">) => (
    <blockquote
      className="mt-6 border-l-2 border-champagne-gold/50 pl-5 italic text-midnight-navy/70"
      {...props}
    />
  ),
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default async function JournalArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getJournalPost(slug);
  if (!post) notFound();

  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Journal", url: "/journal" },
    { name: post.title, url: `/journal/${slug}` },
  ];

  // Two more articles to keep the reader on-site.
  const related = getAllJournalMeta()
    .filter((p) => p.slug !== slug)
    .slice(0, 2);

  return (
    <div className="bg-ivory">
      <JsonLd id="ld-article" data={blogPostingSchema(post)} />
      <JsonLd id="ld-article-breadcrumb" data={breadcrumbSchema(crumbs)} />

      <article className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
        <BackButton fallbackHref="/journal" />

        <header className="mt-10 mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-champagne-gold">
            {formatDate(post.date)} &middot; {post.readingMinutes} min read
          </p>
          <h1 className="mt-4 font-heading text-3xl leading-tight text-midnight-navy sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-midnight-navy/70">
            {post.description}
          </p>
        </header>

        <div className="border-t border-champagne-gold/25 pt-2">
          <MDXRemote source={post.content} components={mdxComponents} />
        </div>

        {related.length > 0 && (
          <footer className="mt-16 border-t border-champagne-gold/30 pt-10">
            <p className="text-xs uppercase tracking-[0.3em] text-champagne-gold">
              Keep reading
            </p>
            <ul className="mt-5 space-y-4">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/journal/${r.slug}`}
                    prefetch
                    className="font-heading text-xl text-midnight-navy underline-offset-4 hover:text-champagne-gold"
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </footer>
        )}
      </article>
    </div>
  );
}
