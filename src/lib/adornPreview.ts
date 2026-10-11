import type { Product } from "@/lib/mockData";

// ============================================================================
// LOCAL PREVIEW ONLY — sample Adorn pieces so the owner can review the two-line
// site before the first real Adorn products are added in Wix.
//
// On only when ADORN_PREVIEW=1 is set on a LOCAL server, and never on Vercel
// (VERCEL is set there), and never once Wix holds a real Adorn piece. The
// pieces have no Wix id, so they can't be ordered — checkout would refuse them.
// Photos: Unsplash (free licence), stand-ins for the owner's own shots.
// ============================================================================

export const ADORN_PREVIEW_ON = process.env.ADORN_PREVIEW === "1" && !process.env.VERCEL;

const photo = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=75`;

const sample = (
  id: string,
  name: string,
  price: number,
  originalPrice: number,
  image: string,
  description: string,
  stockCount = 8,
): Product => ({
  id: `preview-${id}`,
  name,
  price,
  originalPrice,
  description,
  intention: "",
  benefits: [],
  intentions: [],
  image: photo(image),
  images: [photo(image)],
  stockCount,
});

export const ADORN_PREVIEW_PRODUCTS: Product[] = [
  sample("kundan-temple-set", "Kundan Temple Necklace Set", 799, 1599, "1601121141461-9d6647bca1ed",
    "Gold-plated kundan choker with matching jhumka earrings, set with ruby-red stones. Brass base, adjustable dori. Weight 48 g."),
  sample("royal-blue-ad-drops", "Royal Blue AD Drop Earrings", 649, 1299, "1535632066927-ab7c9ab60908",
    "American diamond (AD) drop earrings with a royal blue centre stone. Rhodium-plated brass, push-back closure. Length 4 cm."),
  sample("rose-gold-cz-drops", "Rose Gold CZ Drop Earrings", 549, 1099, "1629224316810-9d8805b95e76",
    "Cubic zirconia (CZ) drops in a rose gold finish. Hook closure, lightweight at 6 g. Anti-tarnish coating."),
  sample("twist-hoops", "Gold-Plated Twist Hoops", 399, 799, "1617038220319-276d3cfab638",
    "Small twisted hoops, gold-plated brass. Everyday studs-size hoop, 2 cm. Hypoallergenic, nickel-free."),
  sample("ad-heart-pendant", "AD Heart Pendant", 499, 999, "1588444837495-c6cfeb53f32d",
    "Open heart pendant pavé-set with American diamonds on a 16-inch chain. Silver-plated, lobster clasp."),
  sample("layered-chain", "Layered Fine Chain Necklace", 449, 899, "1611652022419-a9419f74343d",
    "Two fine chains layered with a CZ drop. Gold-plated, 16 + 18 inch, lobster clasp. Minimal, made for every day."),
  sample("sapphire-heart-earrings", "Sapphire Heart Earrings", 349, 699, "1630019852942-f89202989a59",
    "Blue heart-cut stone on a gold-plated hook. Lightweight, 3 g each.", 3),
  sample("ad-solitaire-ring", "AD Solitaire Ring", 449, 899, "1605100804763-247f67b3557e",
    "Halo solitaire ring set with American diamonds. Rhodium-plated, adjustable band."),
  sample("crystal-ad-bracelet", "Crystal AD Bracelet", 599, 1199, "1573408301185-9146fe634ad0",
    "Link bracelet of American diamond rondels. Rhodium-plated brass, box clasp. 7 inch."),
  sample("cz-flower-ring", "CZ Flower Cocktail Ring", 499, 999, "1602751584552-8ba73aad10e1",
    "Statement cocktail ring — amethyst- and citrine-coloured CZ petals. Silver-plated, adjustable."),
];
