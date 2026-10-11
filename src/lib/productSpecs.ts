import type { Product } from "@/lib/mockData";
import { lineOf, pieceTypeInfo, pieceTypeOf } from "@/lib/lines";

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
//
// Adorn (stone jewellery) gets its own rows — stone, finish, base metal,
// closure, size, weight, skin-friendly — under the same rule, and NEVER the
// "Natural gemstone" row, even if the word "natural" appears in its copy.
// ============================================================================

export type SpecRow = { label: string; value: string };

// [pattern, value] pairs; the first match wins within a row.
type Rule = readonly [RegExp, string];
const firstMatch = (text: string, rules: readonly Rule[]): string | undefined =>
  rules.find(([re]) => re.test(text))?.[1];

const ADORN_STONE: readonly Rule[] = [
  [/\b(american\s?diamonds?|\bAD\b)/i, "American diamond (AD)"],
  [/\b(cubic\s?zirconia|\bCZ\b)/i, "Cubic zirconia (CZ)"],
  [/\bkundan\b/i, "Kundan"],
  [/\bpolki\b/i, "Polki"],
  [/\bpearls?\b/i, "Pearl"],
  [/\bzircon\b/i, "Zircon"],
  [/\brhinestones?\b/i, "Rhinestone"],
];
const ADORN_FINISH: readonly Rule[] = [
  [/\brose[-\s]?gold\b/i, "Rose gold"],
  [/\bgold[-\s]?plated\b/i, "Gold-plated"],
  [/\b(rhodium[-\s]?plated|rhodium)\b/i, "Rhodium-plated"],
  [/\bsilver[-\s]?plated\b/i, "Silver-plated"],
  [/\boxidi[sz]ed\b/i, "Oxidised"],
  [/\bantique\b/i, "Antique gold"],
];
const ADORN_METAL: readonly Rule[] = [
  [/\b925\b|\bsterling\b/i, "925 sterling silver"],
  [/\bbrass\b/i, "Brass"],
  [/\bcopper\b/i, "Copper"],
  [/\b(stainless\s?steel)\b/i, "Stainless steel"],
  [/\balloy\b/i, "Alloy"],
];
const ADORN_CLOSURE: readonly Rule[] = [
  [/\bpush[-\s]?back\b/i, "Push-back"],
  [/\bscrew[-\s]?back\b/i, "Screw-back"],
  [/\bhook\b/i, "Hook"],
  [/\blobster\b/i, "Lobster clasp"],
  [/\b(dori|adjustable\s?thread)\b/i, "Adjustable dori"],
  [/\bbox\s?clasp\b/i, "Box clasp"],
  [/\badjustable\b/i, "Adjustable"],
];

const intentionsSpecs = (product: Product): SpecRow[] => {
  const d = product.description;
  const rows: SpecRow[] = [];

  rows.push({ label: "Piece", value: pieceTypeInfo(pieceTypeOf(product)).label });

  const bead = d.match(/(\d+(?:\.\d+)?)\s?mm\b/i);
  if (bead) rows.push({ label: "Bead size", value: `${bead[1]} mm` });

  if (/\bnatural\b/i.test(d)) rows.push({ label: "Stone", value: "Natural gemstone" });
  if (/\bhand(?:crafted|made)\b/i.test(d)) rows.push({ label: "Made", value: "Handcrafted" });
  if (/\bunisex\b/i.test(d)) rows.push({ label: "For", value: "Unisex" });

  return rows;
};

const adornSpecs = (product: Product): SpecRow[] => {
  // The name counts too — "Royal Blue AD Drop Earrings" names its stone.
  const d = `${product.name}. ${product.description}`;
  const rows: SpecRow[] = [{ label: "Piece", value: pieceTypeInfo(pieceTypeOf(product)).label }];
  const add = (label: string, value: string | undefined) => value && rows.push({ label, value });

  add("Stone", firstMatch(d, ADORN_STONE));
  add("Finish", firstMatch(d, ADORN_FINISH));
  add("Base metal", firstMatch(product.description, ADORN_METAL));
  add("Closure", firstMatch(product.description, ADORN_CLOSURE));

  const length = product.description.match(/(\d+(?:\.\d+)?(?:\s?\+\s?\d+(?:\.\d+)?)?)[-\s]?(cm|mm|inch(?:es)?|in)\b/i);
  if (length) add("Size", `${length[1]} ${length[2].toLowerCase().startsWith("in") ? "inch" : length[2].toLowerCase()}`);
  const weight = product.description.match(/(\d+(?:\.\d+)?)\s?(g|gm|grams?)\b/i);
  if (weight) add("Weight", `${weight[1]} g`);

  const skin = [
    /\bhypo-?allergenic\b/i.test(d) && "Hypoallergenic",
    /\bnickel[-\s]?free\b/i.test(d) && "Nickel-free",
    /\banti[-\s]?tarnish\b/i.test(d) && "Anti-tarnish",
  ].filter(Boolean) as string[];
  if (skin.length) add("Wear", skin.join(" · "));
  if (/\bhand(?:crafted|made)\b/i.test(d)) add("Made", "Handcrafted");

  return rows;
};

export const productSpecs = (product: Product): SpecRow[] =>
  lineOf(product) === "adorn" ? adornSpecs(product) : intentionsSpecs(product);
