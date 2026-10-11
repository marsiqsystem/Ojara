// ============================================================================
// OJARA's two product lines — ONE place that decides which line a piece belongs
// to and what kind of piece it is. Shop filters, offers, the bag, the product
// page, the menu and the Google feed all ask this module, so a pair of earrings
// can never be counted as a bracelet again (the old name test, /\bring\b/,
// read "Kundan Jhumka Earrings" as a bracelet).
//
//   Intentions — natural gemstone bracelets and rings, sold on what they mean.
//   Adorn      — stone jewellery (American diamond / CZ, kundan, polki…):
//                earrings, necklaces, pendants, sets — sold on how they look.
//
// One brand, two reasons to buy. The lines share the bag, checkout, delivery
// and WELCOME10; they do NOT share claims: "natural", "lab-certified",
// "cleansed & charged" are Intentions-only (see /terms copy rule).
//
// HOW A PIECE IS CLASSIFIED (first hit wins):
//   1. Wix collections. A product in a collection whose slug is "adorn" (or
//      starts with "adorn-") is Adorn; in "intentions" it's Intentions. A
//      collection named after a piece type ("earrings", "necklaces", "rings"…)
//      sets the type. This is how the owner overrides anything below.
//   2. The product name: piece words (earrings, jhumka, choker, pendant…) and
//      stone-jewellery words (American diamond, AD, CZ, kundan, polki…).
//   3. Otherwise: an Intentions bracelet — what the whole catalogue was until now.
// ============================================================================

export type Line = "intentions" | "adorn";

export type PieceType =
  | "bracelet"
  | "ring"
  | "earrings"
  | "necklace"
  | "pendant"
  | "set"
  | "bangle"
  | "anklet"
  | "nose-pin";

export interface LineInfo {
  key: Line;
  /** The line's name, as the shopper sees it. */
  name: string;
  /** What's in it, in plain words — always shown next to the name. */
  descriptor: string;
  /** The reason to buy, in four words or so. */
  promise: string;
  /** One-line pitch for tiles and page intros. */
  pitch: string;
  href: string;
}

export const LINES: Record<Line, LineInfo> = {
  intentions: {
    key: "intentions",
    name: "Intentions",
    descriptor: "Natural gemstone bracelets & rings",
    promise: "Worn for what it means",
    pitch: "Natural gemstones, each worn as a daily reminder of what you're working toward.",
    href: "/intentions",
  },
  adorn: {
    key: "adorn",
    name: "Adorn",
    descriptor: "Stone jewellery — necklace sets with matching earrings",
    promise: "Worn for how you shine",
    pitch: "Sparkling necklace sets with matching earrings, for festive days, parties and every day in between.",
    href: "/adorn",
  },
};

export interface PieceTypeInfo {
  key: PieceType;
  /** Singular, for a product's "Piece" row. */
  label: string;
  /** Plural, for filters, menus and category pages. */
  plural: string;
  /** /category/<slug> for the Adorn piece pages. */
  slug: string;
}

// Shop-filter order: the Intentions pieces first (most of the catalogue), then
// Adorn by how often each sells in Indian fashion jewellery (earrings lead).
export const PIECE_TYPE_INFO: readonly PieceTypeInfo[] = [
  { key: "bracelet", label: "Bracelet", plural: "Bracelets", slug: "bracelets" },
  { key: "ring", label: "Ring", plural: "Rings", slug: "rings" },
  { key: "earrings", label: "Earrings", plural: "Earrings", slug: "earrings" },
  { key: "necklace", label: "Necklace", plural: "Necklaces", slug: "necklaces" },
  { key: "pendant", label: "Pendant", plural: "Pendants", slug: "pendants" },
  { key: "set", label: "Jewellery set", plural: "Jewellery sets", slug: "jewellery-sets" },
  { key: "bangle", label: "Bangle", plural: "Bangles", slug: "bangles" },
  { key: "anklet", label: "Anklet", plural: "Anklets", slug: "anklets" },
  { key: "nose-pin", label: "Nose pin", plural: "Nose pins", slug: "nose-pins" },
];

export const pieceTypeInfo = (key: PieceType): PieceTypeInfo =>
  PIECE_TYPE_INFO.find((t) => t.key === key) ?? PIECE_TYPE_INFO[0];

// Pieces only the Adorn line makes. A bracelet or ring can be either line; a
// jewellery set is always Adorn, even when Wix files it under Rings.
const ADORN_ONLY_TYPES: ReadonlySet<PieceType> = new Set([
  "earrings",
  "set",
  "necklace",
  "pendant",
  "bangle",
  "anklet",
  "nose-pin",
]);

// Name words → piece type, most specific first: a set before its parts, nose
// rings before rings, "bracelet" before "chain" ("Evil Eye Chain Bracelet" is a
// bracelet). "ring" can't match "earring" — \b sees no boundary inside it.
const TYPE_WORDS: ReadonlyArray<readonly [RegExp, PieceType]> = [
  [/\b(jewell?e?ry\s?sets?|necklace\s?sets?|choker\s?sets?|earrings?\s?sets?)\b/i, "set"],
  [/\b(nose\s?pins?|nose\s?rings?|nath)\b/i, "nose-pin"],
  [/\b(ear\s?rings?|jhumk(a|as|i|is)|studs?|hoops?|huggies?|danglers?|drops?|chandbalis?|ear\s?cuffs?|balis?|tops)\b/i, "earrings"],
  [/\bbracelets?\b/i, "bracelet"],
  [/\b(necklaces?|chokers?|mangalsutras?|haar|chains?|collars?)\b/i, "necklace"],
  [/\b(pendants?|lockets?)\b/i, "pendant"],
  [/\b(bangles?|kadas?|kangans?|cuffs?)\b/i, "bangle"],
  [/\b(anklets?|payals?)\b/i, "anklet"],
  [/\brings?\b/i, "ring"],
];

// Stone-jewellery words. Any of these in the name puts a bracelet or ring in
// Adorn: "AD Stone Ring" is fashion jewellery, "Citrine Ring" is a gemstone.
const ADORN_WORDS =
  /\b(american\s?diamonds?|ad|cz|cubic\s?zirconia|zircon(ia)?|kundan|polki|meenakari|temple|oxidi[sz]ed|stone[-\s]?studded|rhinestones?|solitaire|antique|rose\s?gold|gold[-\s]?plated|silver[-\s]?plated|emerald[-\s]?green|ruby[-\s]?red)\b/i;

/** Wix collection slugs that set the line or type directly (owner overrides). */
const COLLECTION_LINE: Record<string, Line> = {
  adorn: "adorn",
  "stone-jewellery": "adorn",
  "stone-jewelry": "adorn",
  intentions: "intentions",
};
const COLLECTION_TYPE: Record<string, PieceType> = {
  bracelets: "bracelet",
  rings: "ring",
  "adorn-rings": "ring",
  earrings: "earrings",
  necklaces: "necklace",
  pendants: "pendant",
  "jewellery-sets": "set",
  "jewelry-sets": "set",
  sets: "set",
  bangles: "bangle",
  anklets: "anklet",
  "nose-pins": "nose-pin",
};

export interface Classifiable {
  name: string;
  line?: Line;
  pieceType?: PieceType;
  /** Adorn: the colour split off the Wix name (see colourLabelOf). */
  colour?: string;
}

/** What kind of piece this is (earrings, ring, bracelet…). */
export const classifyPieceType = (name: string, collectionSlugs: readonly string[] = []): PieceType => {
  for (const slug of collectionSlugs) {
    const t = COLLECTION_TYPE[slug] ?? (slug.startsWith("adorn-") ? COLLECTION_TYPE[slug.slice(6)] : undefined);
    // "rings" and "bracelets" are the Intentions collections Wix's offers key on;
    // they decide the type only when the name doesn't say something more specific.
    if (t && t !== "ring" && t !== "bracelet") return t;
  }
  for (const [re, type] of TYPE_WORDS) if (re.test(name)) return type;
  for (const slug of collectionSlugs) {
    const t = COLLECTION_TYPE[slug];
    if (t) return t;
  }
  return "bracelet";
};

/** Which line a piece belongs to. */
export const classifyLine = (
  name: string,
  pieceType: PieceType,
  collectionSlugs: readonly string[] = [],
): Line => {
  for (const slug of collectionSlugs) {
    const l = COLLECTION_LINE[slug] ?? (slug.startsWith("adorn-") ? "adorn" : undefined);
    if (l) return l;
  }
  if (ADORN_ONLY_TYPES.has(pieceType)) return "adorn";
  if (ADORN_WORDS.test(name)) return "adorn";
  return "intentions";
};

/** The piece's type — from the catalogue when it set one, else from its name. */
export const pieceTypeOf = (p: Classifiable): PieceType => p.pieceType ?? classifyPieceType(p.name);

/** The piece's line — from the catalogue when it set one, else from its name. */
export const lineOf = (p: Classifiable): Line => p.line ?? classifyLine(p.name, pieceTypeOf(p));

export const isAdorn = (p: Classifiable): boolean => lineOf(p) === "adorn";

// ---------------------------------------------------------------------------
// Occasions — how Adorn is shopped ("something for Diwali", "studs for work").
// From the owner's Wix collections first ("festive", "everyday", "party",
// "wedding"), else read off the name's style words. Intentions pieces have none.
// ---------------------------------------------------------------------------

export type Occasion = "festive" | "everyday" | "party";

export const OCCASIONS: readonly { key: Occasion; label: string; blurb: string }[] = [
  { key: "festive", label: "Festive & Wedding", blurb: "Statement necklace sets for pujas, sangeets and Diwali nights." },
  { key: "everyday", label: "Everyday & Office", blurb: "Light studs, hoops and fine chains you'll forget you're wearing." },
  { key: "party", label: "Party & Evening", blurb: "Statement sparkle for when the lights go down." },
];

const OCCASION_COLLECTIONS: Record<string, Occasion> = {
  festive: "festive",
  wedding: "festive",
  "festive-wedding": "festive",
  everyday: "everyday",
  office: "everyday",
  "everyday-office": "everyday",
  party: "party",
  evening: "party",
  "party-evening": "party",
};

const OCCASION_WORDS: ReadonlyArray<readonly [RegExp, Occasion]> = [
  [/\b(kundan|polki|jhumk\w*|temple|meenakari|chandbali\w*|antique|bridal|maang\s?tikka|rani\s?haar|choker\s?set)\b/i, "festive"],
  [/\b(cocktail|statement|party|evening|danglers?|drops?)\b/i, "party"],
  [/\b(studs?|minimal\w*|hoops?|huggies?|solitaire|everyday|office|dainty|tops)\b/i, "everyday"],
];

export const classifyOccasions = (name: string, collectionSlugs: readonly string[] = []): Occasion[] => {
  const fromWix = [
    ...new Set(collectionSlugs.map((s) => OCCASION_COLLECTIONS[s.replace(/^adorn-/, "")]).filter(Boolean)),
  ] as Occasion[];
  if (fromWix.length) return fromWix;
  const hit = OCCASION_WORDS.find(([re]) => re.test(name));
  return hit ? [hit[1]] : [];
};

// ---------------------------------------------------------------------------
// Adorn's exchange rule (owner, 2026-10-11): sets include earrings, a hygiene
// item, so no change-of-mind exchange — damaged or wrong pieces are replaced.
// Intentions keeps the 48-hour exchange.
// ---------------------------------------------------------------------------

export const ADORN_EXCHANGE_POLICY =
  "Earrings and jewellery sets can't be exchanged for a change of mind, for hygiene reasons. If your piece arrives damaged or isn't what you ordered, tell us within 48 hours of delivery with your unboxing video and we'll replace it at no cost.";

// ---------------------------------------------------------------------------
// Colours. Wix holds each colour of an Adorn design as its own product, named
// "<Design> - <COLOUR>" ("Jasmine Jewelry Set- DARK GREEN"). The product page
// joins them back into one "Colour" picker so a shopper sees every option.
// ---------------------------------------------------------------------------

const COLOUR_SUFFIX = /^(.+?)\s*[-–—]\s*([A-Za-z][A-Za-z ]{1,24})$/;

/** "Jasmine Jewelry Set- DARK GREEN" → { design: "Jasmine Jewelry Set", colour: "Dark Green" }. */
export const colourOf = (name: string): { design: string; colour: string } | undefined => {
  const m = name.trim().match(COLOUR_SUFFIX);
  if (!m) return undefined;
  const colour = m[2].trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return { design: m[1].trim(), colour };
};

// catalog.ts splits an Adorn name on load: `name` = the design (what the page
// shows), `colour` = the suffix (what the picker shows). Older bag entries
// still carry the full Wix name, so these read either form.

/** The piece's colour ("Aqua"), or undefined. */
export const colourLabelOf = (p: Classifiable): string | undefined =>
  p.colour ?? (isAdorn(p) ? colourOf(p.name)?.colour : undefined);

/** The design name the shopper sees ("Hayat Jewelry Set"). */
export const designNameOf = (p: Classifiable): string =>
  p.colour ? p.name : (isAdorn(p) && colourOf(p.name)?.design) || p.name;

/**
 * Name + colour ("Hayat Jewelry Set - Aqua") — for anything that must tell two
 * colours apart: order lines and emails, analytics, search engines, the bag.
 */
export const fullNameOf = (p: Classifiable): string => (p.colour ? `${p.name} - ${p.colour}` : p.name);

/** Every colour of this piece's design (itself included), or [] when it has none. */
export const colourSiblings = <P extends Classifiable & { id: string }>(product: P, catalog: readonly P[]): P[] => {
  if (!colourLabelOf(product)) return [];
  const design = designNameOf(product).toLowerCase();
  const all = catalog.filter((p) => isAdorn(p) && !!colourLabelOf(p) && designNameOf(p).toLowerCase() === design);
  return all.length > 1 ? all : [];
};
