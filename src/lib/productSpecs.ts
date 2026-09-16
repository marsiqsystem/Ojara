import type { Product } from "@/lib/mockData";

// ============================================================================
// Product details — the scannable spec list competitors lead with (bead size,
// what it's made of, who it's for).
//
// HONESTY RULE: every row here is read from something OJARA already states. A
// row only appears when that product's own Wix description says it (bead size,
// "handcrafted", "natural", "unisex"). Delivery isn't repeated here — the PDP's
// delivery strip sits directly above this list. Nothing is inferred or
// defaulted — a product whose description doesn't mention its bead size simply
// shows no bead-size row. To add a row, add the fact to the Wix description.
// ============================================================================

export type SpecRow = { label: string; value: string };

const isRing = (p: Product) => /\bring\b/i.test(p.name);

export const productSpecs = (product: Product): SpecRow[] => {
  const d = product.description;
  const rows: SpecRow[] = [];

  rows.push({ label: "Piece", value: isRing(product) ? "Ring" : "Bracelet" });

  const bead = d.match(/(\d+(?:\.\d+)?)\s?mm\b/i);
  if (bead) rows.push({ label: "Bead size", value: `${bead[1]} mm` });

  if (/\bnatural\b/i.test(d)) rows.push({ label: "Stone", value: "Natural gemstone" });
  if (/\bhand(?:crafted|made)\b/i.test(d)) rows.push({ label: "Made", value: "Handcrafted" });
  if (/\bunisex\b/i.test(d)) rows.push({ label: "For", value: "Unisex" });

  return rows;
};
