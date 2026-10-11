import type { Product } from "@/lib/mockData";
import { fullNameOf, lineOf, pieceTypeOf } from "@/lib/lines";

// ============================================================================
// "Complete the look" — pairs an Adorn piece with an Intentions bracelet by
// colour, so the pairing reads as styled, not random: blue AD drops with Lapis,
// gold kundan with Citrine or Pyrite, rose-gold CZ with Rose Quartz.
//
// Colour is read off the words in each piece's name (and Adorn's description).
// Pairs show the plain sum of the two prices — there is no pairing discount, so
// none is implied.
// ============================================================================

type Family = "gold" | "blue" | "pink" | "red" | "green" | "purple" | "white" | "black";

const FAMILY_WORDS: ReadonlyArray<readonly [Family, RegExp]> = [
  ["gold", /\b(gold|golden|citrine|pyrite|tiger'?s?\s?eye|kundan|polki|temple|antique|jhumk\w*|money)\b/i],
  ["blue", /\b(blue|sapphire|lapis|turquoise|aquamarine|navy)\b/i],
  ["pink", /\b(rose|pink|blush|love)\b/i],
  ["red", /\b(red|ruby|carnelian|garnet|maroon)\b/i],
  ["green", /\b(green|emerald|aventurine|jade|peridot)\b/i],
  ["purple", /\b(purple|amethyst|lavender|violet)\b/i],
  ["white", /\b(white|silver|pearl|moonstone|howlite|ad|american\s?diamond|cz|crystal|diamond|rhodium|clear\s?quartz|zirconia)\b/i],
  ["black", /\b(black|onyx|tourmaline|obsidian|oxidi[sz]ed|lava|evil\s?eye)\b/i],
];

const familiesOf = (text: string): Set<Family> =>
  new Set(FAMILY_WORDS.filter(([, re]) => re.test(text)).map(([f]) => f));

// "White" is mostly the sparkle itself (AD, CZ, rhodium) rather than the
// piece's colour, so a real colour match — blue AD drops with Lapis — beats it.
const colourScore = (a: Set<Family>, b: Set<Family>): number =>
  [...a].filter((f) => b.has(f)).reduce((s, f) => s + (f === "white" ? 0.5 : 1), 0);

export interface LookPair {
  adorn: Product;
  bracelet: Product;
}

// Easiest additions to a bracelet first: no size to get right, any outfit.
const ADORN_ORDER = ["earrings", "pendant", "necklace", "set", "ring", "bracelet"];

/** Up to `limit` colour-matched pairs, each piece used once, in stock only. */
export const lookPairs = (catalog: Product[], limit = 3): LookPair[] => {
  const inStock = catalog.filter((p) => p.stockCount > 0);
  // One of each kind before a second of any (earrings, pendant, necklace, …),
  // so three pairs show three different looks.
  const byType = ADORN_ORDER.map((t) =>
    inStock.filter((p) => lineOf(p) === "adorn" && pieceTypeOf(p) === t),
  );
  const adorn: Product[] = [];
  for (let i = 0; byType.some((list) => i < list.length); i++) {
    for (const list of byType) if (list[i]) adorn.push(list[i]);
  }
  const bracelets = inStock.filter((p) => lineOf(p) === "intentions" && pieceTypeOf(p) === "bracelet");

  const used = new Set<string>();
  const pairs: LookPair[] = [];
  for (const piece of adorn) {
    if (pairs.length >= limit) break;
    const fam = familiesOf(`${fullNameOf(piece)} ${piece.description}`);
    const best = bracelets
      .filter((b) => !used.has(b.id))
      .map((b) => ({ b, score: colourScore(familiesOf(fullNameOf(b)), fam) }))
      .sort((x, y) => y.score - x.score)[0];
    // Only colour matches — an unmatched pair reads as random.
    if (!best || best.score === 0) continue;
    used.add(best.b.id);
    pairs.push({ adorn: piece, bracelet: best.b });
  }
  return pairs;
};

/**
 * Pieces from the OTHER line to wear with `product`, best colour match first,
 * then cheapest — the product page's "Complete the look" row. For an Adorn
 * piece these are Intentions bracelets; for an Intentions piece, Adorn pieces.
 */
export const crossLinePicks = (product: Product, catalog: Product[], limit = 6): Product[] => {
  const otherLine = lineOf(product) === "adorn" ? "intentions" : "adorn";
  const fam = familiesOf(`${fullNameOf(product)} ${lineOf(product) === "adorn" ? product.description : ""}`);
  return catalog
    .filter(
      (p) =>
        p.stockCount > 0 &&
        lineOf(p) === otherLine &&
        // From Adorn, suggest bracelets (the Intentions entry piece), not rings.
        (otherLine === "adorn" || pieceTypeOf(p) === "bracelet"),
    )
    .map((p) => ({
      p,
      score: colourScore(familiesOf(`${fullNameOf(p)} ${otherLine === "adorn" ? p.description : ""}`), fam),
    }))
    .sort((a, b) => b.score - a.score || a.p.price - b.p.price)
    .slice(0, limit)
    .map((x) => x.p);
};
