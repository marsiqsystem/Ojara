import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/lib/commerce/config";
import BackButton from "@/components/BackButton";
import FaqAccordion, { type FaqItem } from "@/components/FaqAccordion";
import JsonLd from "@/components/seo/JsonLd";
import { faqSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "FAQ",
  alternates: { canonical: "/faq" },
  description:
    "Answers to common questions about OJARA gemstones and stone jewellery, orders, and care.",
};

const faqs: FaqItem[] = [
  {
    question: "What's the difference between Intentions and Adorn?",
    answer:
      "OJARA has two lines. Intentions are natural gemstone bracelets and rings, each worn for what its stone has long stood for. Adorn is stone jewellery — necklace sets with matching earrings, worn for how they look. Both go in the same bag, with free delivery and Cash on Delivery.",
  },
  {
    question: "Are your Intentions crystals genuine and ethically sourced?",
    answer:
      "Always. Every Intentions piece is a natural stone, sourced through trusted partners who honour fair, responsible mining practices. Each one is authenticated before it reaches you.",
  },
  {
    question: "Are Adorn stones natural gemstones?",
    answer:
      "No — and we say so on every Adorn page. Adorn is stone jewellery set with sparkling set stones, not natural gemstones. Where a piece's materials are listed, you'll find them under Product details; for anything else, write to ojara.jewel@gmail.com.",
  },
  {
    question: "How do I care for Adorn jewellery?",
    answer:
      "Put it on last — after perfume, hairspray and lotion — and take it off first. Keep it away from water and sweat, wipe it with a soft dry cloth after wearing, and store each piece on its own so the stones don't scratch and the finish stays bright.",
  },
  {
    question: "What does it mean that Intentions pieces are 'cleansed and charged'?",
    answer:
      "Before shipping, each piece is cleared of residual energy and set with intention — traditionally through sage smoke, sound, or moonlight — so it arrives ready to work with you rather than carrying the energy of everyone who handled it before.",
  },
  {
    question: "How do I care for and recharge my crystal?",
    answer:
      "Cleanse it gently with sage smoke or a night of moonlight whenever it feels heavy or after intense use. Keep it away from prolonged direct sunlight and harsh water, as some stones are delicate.",
  },
  {
    question: "Will my piece look exactly like the photo?",
    answer:
      "Each stone is one of a kind. Colour, shape, and natural inclusions vary from piece to piece — the photograph represents the quality and character you'll receive, not an identical twin.",
  },
  {
    question: "How long will shipping take?",
    answer:
      "We ship within India only — we don't deliver internationally. Orders arrive within 3–7 business days. You'll receive tracking as soon as your order ships. See our Shipping & Returns page for full details.",
  },
  {
    question: "What is your exchange policy?",
    answer:
      "We don't offer returns or refunds — we offer exchanges. If your piece isn't the right fit, request an exchange within 48 hours of delivery, unused and in its original packaging, and we'll help you swap it. Earrings and jewellery sets (OJARA Adorn) are the exception: for hygiene they can't be exchanged for a change of mind, but if one arrives damaged or isn't what you ordered, tell us within 48 hours with your unboxing video and we'll replace it.",
  },
];

export default function FaqPage() {
  return (
    <div className="bg-ivory">
      {/* FAQPage structured data — the Q&As below are the visible source, so the
          schema and the page content always match (Google requires this). */}
      <JsonLd id="ld-faq" data={faqSchema(faqs)} />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
        <BackButton fallbackHref="/" />

        <header className="mt-10 mb-12 text-center">
          <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">
            Support
          </span>
          <h1 className="mt-5 font-heading text-4xl text-midnight-navy sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-midnight-navy/70">
            Everything you need to know about our crystals, orders, and care. If
            your question isn&apos;t here, our Energy Guides are always happy to
            help.
          </p>
        </header>

        <FaqAccordion items={faqs} />

        <p className="mt-16 border-t border-champagne-gold/30 pt-8 text-center text-sm leading-7 text-midnight-navy/70">
          Still curious? Write to us at{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-champagne-gold font-medium underline-offset-4 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
