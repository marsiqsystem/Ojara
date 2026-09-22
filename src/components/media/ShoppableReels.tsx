import { getAllProducts, type Product } from "@/lib/catalog";
import { productForReel, type Reel } from "@/lib/media";
import ReelRail from "@/components/media/ReelRail";

/**
 * Server wrapper for ReelRail: resolves the in-stock piece each reel sells
 * (Money Magnet reel → Money Magnet Bracelet) so every card can link to it and
 * the player can add it to the bag.
 */
export default async function ShoppableReels({
  reels,
  catalog,
  ...rail
}: {
  reels: Reel[];
  /** Pass the catalogue if the page already has it. */
  catalog?: Product[];
  eyebrow?: string;
  title: string;
  subtitle?: string;
  id?: string;
  className?: string;
  dark?: boolean;
}) {
  if (reels.length === 0) return null;
  const products = catalog ?? (await getAllProducts());
  const shop = Object.fromEntries(reels.map((r) => [r.id, productForReel(r, products)]));
  return <ReelRail reels={reels} shop={shop} {...rail} />;
}
