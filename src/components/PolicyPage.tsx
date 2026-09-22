import { SUPPORT_EMAIL } from "@/lib/commerce/config";
import BackButton from "@/components/BackButton";

export interface PolicySection {
  heading: string;
  body: string[];
}

/**
 * Shared shell for the prose-based trust/legal pages (Privacy, Terms,
 * Shipping & Returns). Keeps typography and spacing consistent: ivory canvas,
 * midnight-navy text, Cinzel headings, generous editorial padding.
 */
export default function PolicyPage({
  title,
  intro,
  updated,
  sections,
}: {
  title: string;
  intro: string;
  updated: string;
  sections: PolicySection[];
}) {
  return (
    <div className="bg-ivory">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
        <BackButton fallbackHref="/" />

        <header className="mt-10 border-b border-champagne-gold/25 pb-10">
          <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">
            OJARA
          </span>
          <h1 className="mt-5 font-heading text-4xl text-midnight-navy sm:text-5xl">
            {title}
          </h1>
          <p className="mt-6 text-base leading-8 text-midnight-navy/70">
            {intro}
          </p>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-midnight-navy/40">
            Last updated · {updated}
          </p>
        </header>

        <div className="mt-12 space-y-12">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-heading text-2xl text-midnight-navy">
                {section.heading}
              </h2>
              <div className="mt-4 space-y-4">
                {section.body.map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-sm leading-7 text-midnight-navy/70"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-16 border-t border-champagne-gold/25 pt-8 text-sm leading-7 text-midnight-navy/60">
          Questions about this policy? Reach our team at{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-champagne-gold underline-offset-4 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
