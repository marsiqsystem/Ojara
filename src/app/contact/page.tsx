import type { Metadata } from "next";
import Image from "next/image";
import ContactForm from "@/components/ContactForm";
import { SUPPORT_EMAIL } from "@/lib/commerce/config";
import BackButton from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Contact Us",
  alternates: { canonical: "/contact" },
  description:
    "Questions about your order, a piece, or an intention? Send OJARA a message — our team replies within one working day.",
};

// SUPPORT_EMAIL is the single source of truth (SUPPORT_EMAIL env -> GMAIL_USER):
// the same inbox /api/contact delivers this form to, so what we advertise here
// can never drift from where mail actually lands. The old copy hardcoded an
// address on a domain we don't own, and every customer email to it bounced.
const INSTAGRAM_URL = "https://www.instagram.com/ojara.india";

export default function ContactPage() {
  return (
    <div className="bg-ivory">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 pt-6">
        <BackButton fallbackHref="/" />
      </div>

      {/* Header */}
      <section className="border-b border-champagne-gold/20 bg-midnight-navy px-4 sm:px-6 py-20 text-center sm:py-24">
        <p className="text-[0.65rem] uppercase tracking-[0.4em] text-champagne-gold">
          ✦ We&rsquo;re here
        </p>
        <h1 className="mt-5 font-heading text-4xl text-ivory sm:text-5xl">
          Contact Us
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-ivory/80">
          Questions about a piece, an order, or which intention is right for you
          — write to us and our team will reply personally.
        </p>
      </section>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-14 px-4 sm:px-6 py-16 lg:grid-cols-2 lg:gap-20 lg:py-24">
        {/* LEFT — the form */}
        <div>
          <h2 className="font-heading text-3xl text-midnight-navy">
            Send us a message
          </h2>
          <p className="mt-3 text-sm leading-6 text-midnight-navy/70">
            Fill in the form below and our team will get back to you as soon as
            possible.
          </p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>

        {/* RIGHT — the channels */}
        <div>
          <h2 className="font-heading text-3xl text-midnight-navy">
            Other ways to reach us
          </h2>
          <p className="mt-3 text-sm leading-6 text-midnight-navy/70">
            Connect with us through your preferred channel. We&rsquo;re always
            here to help.
          </p>

          <div className="mt-8 flex flex-col gap-4">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-2xl border border-champagne-gold/25 bg-sand/50 px-4 sm:px-6 py-5 transition-all duration-150 hover:border-champagne-gold/60 active:scale-[0.99]"
            >
              <span>
                <span className="block text-xs text-midnight-navy/60">
                  Follow us on
                </span>
                <span className="mt-1 block font-heading text-lg text-midnight-navy">
                  Instagram
                </span>
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ivory shadow-sm">
                <Image src="/instagram.png" alt="" width={22} height={22} />
              </span>
            </a>

            {/* Facebook: no url from the owner yet. Rendered inert rather than
                linking to "#", which would look live and go nowhere. */}
            <div
              title="Coming soon"
              className="flex items-center justify-between rounded-2xl border border-champagne-gold/15 bg-sand/30 px-4 sm:px-6 py-5 opacity-50"
            >
              <span>
                <span className="block text-xs text-midnight-navy/60">
                  Like us on
                </span>
                <span className="mt-1 block font-heading text-lg text-midnight-navy">
                  Facebook{" "}
                  <span className="text-xs tracking-wide text-midnight-navy/50">
                    — coming soon
                  </span>
                </span>
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ivory shadow-sm">
                <Image src="/facebook.png" alt="" width={22} height={22} />
              </span>
            </div>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="group flex items-center justify-between rounded-2xl border border-champagne-gold/25 bg-sand/50 px-4 sm:px-6 py-5 transition-all duration-150 hover:border-champagne-gold/60 active:scale-[0.99]"
            >
              <span className="min-w-0">
                <span className="block text-xs text-midnight-navy/60">
                  Send us an email
                </span>
                <span className="mt-1 block break-all font-heading text-lg text-midnight-navy">
                  {SUPPORT_EMAIL}
                </span>
              </span>
              <span className="ml-4 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-ivory shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-midnight-navy"
                  aria-hidden="true"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 6L2 7" />
                </svg>
              </span>
            </a>

            <div className="rounded-2xl border border-champagne-gold/25 bg-sand px-4 sm:px-6 py-6">
              <p className="font-heading text-sm uppercase tracking-[0.2em] text-midnight-navy">
                Registered Address
              </p>
              <address className="mt-3 text-sm not-italic leading-7 text-midnight-navy/80">
                <span className="font-semibold text-midnight-navy">OJARA</span>
                <br />
                9/D, New Panchanantala Road
                <br />
                Police Station &amp; Post Office &mdash; Belgharia
                <br />
                Kolkata &ndash; 700 056
                <br />
                West Bengal, India
              </address>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
