import type { Product } from "@/lib/mockData";
import FaqAccordion, { type FaqItem } from "@/components/FaqAccordion";

/**
 * Item-specific FAQ for the product page. Builds questions from the product's
 * own name and intention so each page reads as tailored to that piece, then
 * hands off to the shared FaqAccordion for the interaction.
 */
export default function ProductFaq({ product }: { product: Product }) {
  const faqs: FaqItem[] = [
    {
      question: `Is this a genuine ${product.name}?`,
      answer: `Yes. Every ${product.name} is a natural, authenticated piece — ethically sourced and inspected before it ships. Because it is a natural stone, colour, shape, and inclusions vary slightly from piece to piece, which is part of its character.`,
    },
    {
      question: "How do I cleanse and recharge it?",
      answer:
        "Cleanse it with sage smoke or a night of moonlight whenever it feels heavy or after intense use. Hold it, breathe, and restate your intention. Keep it away from prolonged direct sunlight and harsh water, as some stones are delicate.",
    },
    {
      question: `How should I use it to ${product.intention.toLowerCase()}?`,
      answer: `Place it where its work begins — your desk, your threshold, or your bedside — or keep it close throughout the day. Treat it as a daily anchor for your intention to ${product.intention.toLowerCase()}, returning to it whenever you need to refocus.`,
    },
    {
      question: "Will it arrive cleansed and ready to use?",
      answer:
        "Always. Each piece is energetically cleared and set with intention before shipping, then wrapped as a gift — so it arrives ready to work with you from the moment you unbox it.",
    },
    {
      question: "What if it isn't the right fit?",
      answer:
        "We offer exchanges rather than returns. If the piece isn't the right fit, request an exchange within 48 hours of delivery — unused and in its original packaging — and we'll help you swap it.",
    },
  ];

  return (
    <section className="border-t border-champagne-gold/30 bg-ivory px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">
            Good to Know
          </span>
          <h2 className="mt-4 font-heading text-3xl text-midnight-navy sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>
        <FaqAccordion items={faqs} />
      </div>
    </section>
  );
}
