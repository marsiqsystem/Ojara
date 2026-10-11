import { hasSpecificIntention, type Product } from "@/lib/mockData";
import FaqAccordion, { type FaqItem } from "@/components/FaqAccordion";
import { ADORN_EXCHANGE_POLICY, lineOf } from "@/lib/lines";
import { productSpecs } from "@/lib/productSpecs";
import { DISPATCH_POLICY_TEXT } from "@/lib/deliveryEstimate";

/**
 * Item-specific FAQ for the product page. Builds questions from the product's
 * own name and intention so each page reads as tailored to that piece, then
 * hands off to the shared FaqAccordion for the interaction.
 */
// Adorn (stone jewellery): what it's made of, care, delivery, exchange, and
// ordering it with a bracelet. No natural-stone or cleansing answers — they
// aren't true of set stones.
const adornFaqs = (product: Product): FaqItem[] => [
  {
    question: `What is the ${product.name} made of?`,
    // Points at Product details only when it lists a material (the Wix
    // description must state it — see lib/productSpecs).
    answer: productSpecs(product).some((r) => ["Stone", "Finish", "Base metal"].includes(r.label))
      ? "Its stone, finish and base metal are listed under Product details on this page, exactly as we describe the piece. OJARA Adorn is stone jewellery — set stones, not natural gemstones; for natural stones, see OJARA Intentions."
      : "It's stone jewellery — sparkling set stones, not natural gemstones; for natural stones, see OJARA Intentions. For the exact materials of this piece, write to ojara.jewel@gmail.com.",
  },
  {
    question: "How do I keep it looking new?",
    answer:
      "Put it on last — after perfume, hairspray and lotion — and take it off first. Keep it away from water and sweat, wipe it with a soft dry cloth after you wear it, and store it on its own in a dry pouch or box so the stones don't scratch and the finish stays bright.",
  },
  {
    question: "When will it arrive?",
    answer: `${DISPATCH_POLICY_TEXT} Delivery is free across India and Cash on Delivery is available.`,
  },
  {
    question: "Can I order it with a gemstone bracelet?",
    answer:
      "Yes. Adorn and Intentions pieces go in the same bag and check out as one order, with free delivery and Cash on Delivery on the whole order.",
  },
  {
    question: "What if it arrives damaged?",
    answer: ADORN_EXCHANGE_POLICY,
  },
];

export default function ProductFaq({ product }: { product: Product }) {
  const faqs: FaqItem[] = lineOf(product) === "adorn" ? adornFaqs(product) : [
    {
      question: `Is this a genuine ${product.name}?`,
      answer: `Yes. Every ${product.name} is a natural, authenticated piece — ethically sourced and inspected before it ships. Because it is a natural stone, colour, shape, and inclusions vary slightly from piece to piece, which is part of its character.`,
    },
    {
      question: "How do I cleanse and recharge it?",
      answer:
        "Cleanse it with sage smoke or a night of moonlight whenever it feels heavy or after intense use. Hold it, breathe, and restate your intention. Keep it away from prolonged direct sunlight and harsh water, as some stones are delicate.",
    },
    // Without a real intention this read "How should I use it to wear your
    // intention?", so those products get the plain version of the question.
    hasSpecificIntention(product)
      ? {
          question: `How should I use it to ${product.intention.toLowerCase()}?`,
          answer: `Place it where its work begins — your desk, your threshold, or your bedside — or keep it close throughout the day. Treat it as a daily anchor for your intention to ${product.intention.toLowerCase()}, returning to it whenever you need to refocus.`,
        }
      : {
          question: "How should I wear it?",
          answer:
            "Wear it every day as a reminder of the intention you set when you put it on — or keep it close on your desk, threshold, or bedside. Return to it whenever you need to refocus.",
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
    <section className="border-t border-champagne-gold/30 bg-ivory px-4 sm:px-6 py-16 sm:py-20">
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
