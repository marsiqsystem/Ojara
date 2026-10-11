"use client";

import { toast } from "sonner";
import type { Product } from "@/lib/mockData";
import { useCartStore } from "@/lib/store/useCartStore";
import { trackEvent } from "@/lib/analytics/capi";
import { contentId, toContents, toGa4Items } from "@/lib/analytics/content";

/**
 * One tap, two pieces — the "Complete the look" pair goes into the bag together
 * and the bag opens on it. One AddToCart event carries both, with their real
 * combined value.
 */
export default function AddBothButton({
  products,
  className = "",
  children = "Add both to bag",
}: {
  products: Product[];
  className?: string;
  children?: React.ReactNode;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const available = products.filter((p) => p.stockCount > 0);
  if (available.length < products.length) return null;

  const onClick = () => {
    for (const p of products) addItem(p);
    const lines = products.map((p) => ({ ...p, quantity: 1 }));
    trackEvent("AddToCart", {
      customData: {
        currency: "INR",
        value: products.reduce((s, p) => s + p.price, 0),
        content_ids: products.map(contentId),
        contents: toContents(lines),
        num_items: products.length,
        content_name: products.map((p) => p.name).join(" + "),
        content_type: "product",
      },
      items: toGa4Items(lines),
    });
    toast.success("✦ Both pieces added", {
      description: products.map((p) => p.name).join(" + "),
      style: { background: "#10b981", color: "#ffffff", border: "none" },
    });
    openCart();
  };

  return (
    <button type="button" onClick={onClick} className={`cursor-pointer transition-all duration-150 active:scale-95 ${className}`}>
      {children}
    </button>
  );
}
