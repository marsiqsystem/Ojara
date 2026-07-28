"use client";

import { useState } from "react";
import type { Product } from "@/lib/mockData";

interface Section {
  key: string;
  title: string;
  body: string;
}

/**
 * Deep-engagement accordion for the product page. Replaces the single blocky
 * description with three unfoldable "chapters" — energy, ritual, and promise —
 * that reward the curious shopper and reinforce the brand's mystique.
 * State-based (single-open), animated with a calm ease-out reveal.
 */
export default function RitualAccordion({ product }: { product: Product }) {
  const sections: Section[] = [
    {
      key: "description",
      title: "Description",
      body: `${product.description} Attuned to ${product.intention.toLowerCase()}, its frequency is meant to be felt as much as seen — a quiet current you keep close.`,
    },
    {
      key: "rituals",
      title: "Crystal Rituals",
      body: "Cleanse with sage smoke or a night of moonlight to recharge its frequency. Hold it between your palms, breathe slowly, and speak your intention aloud — then place it where its work begins: your desk, your threshold, your bedside.",
    },
    {
      key: "shipping",
      title: "Shipping & Exchanges",
      body: "Free standard delivery on all PAN-India orders. Orders dispatch within 24-48 hours. We don't offer returns or refunds — we offer exchanges: if the piece isn't the right fit, request an exchange within 48 hours of delivery, unused and in its original packaging.",
    },
  ];

  // First chapter open by default so the section never reads as empty.
  const [open, setOpen] = useState<string | null>("description");

  return (
    <div className="mt-8 divide-y divide-champagne-gold/25 border-y border-champagne-gold/25">
      {sections.map((section) => {
        const isOpen = open === section.key;
        return (
          <div key={section.key}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : section.key)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left transition-all duration-150 active:scale-[0.99]"
              >
                <span className="font-heading text-lg tracking-[0.05em] text-midnight-navy">
                  {section.title}
                </span>
                <span
                  aria-hidden="true"
                  className={`text-xl leading-none text-champagne-gold transition-transform duration-300 ease-out ${
                    isOpen ? "rotate-45" : "rotate-0"
                  }`}
                >
                  +
                </span>
              </button>
            </h3>
            <div
              className={`grid transition-all duration-500 ease-out ${
                isOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="pb-6 text-sm leading-7 text-midnight-navy/70">
                  {section.body}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
