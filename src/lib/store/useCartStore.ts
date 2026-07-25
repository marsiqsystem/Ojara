import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/mockData";

// Minimal shape we use off the Wix client for cart sync.
type WixCartLineItem = {
  catalogReference: { appId: string; catalogItemId: string | undefined };
  quantity: number;
};
type WixCartClient = {
  currentCart: {
    deleteCurrentCart: () => Promise<unknown>;
    addToCurrentCart: (arg: { lineItems: WixCartLineItem[] }) => Promise<unknown>;
  };
};

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  cartItems: CartItem[];
  isCartOpen: boolean;
  // The checkout modal (opened from the cart's "ORDER NOW"). Never persisted.
  isCheckoutOpen: boolean;
  // The account drawer. Lives here so it can be mounted ONCE (in layout) and
  // opened from both the desktop header and the mobile bottom nav. Previously
  // each rendered its own <AuthDrawer>, so on desktop two were in the DOM at once
  // — duplicate ids (#ojara-email/#ojara-password) and two aria-modal dialogs,
  // which broke label->input focus and made the form look untypeable.
  isAuthOpen: boolean;
  // Coupon + gift-wrap live on the store so they survive the cart → checkout
  // hand-off (the checkout modal reads them) and a page refresh.
  appliedCoupon: string;
  giftWrap: boolean;
  giftNote: string;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  openAuth: () => void;
  closeAuth: () => void;
  setAppliedCoupon: (code: string) => void;
  setGiftWrap: (on: boolean) => void;
  setGiftNote: (note: string) => void;
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

async function syncWixCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  
  if (syncTimeout) clearTimeout(syncTimeout);
  
  syncTimeout = setTimeout(async () => {
    try {
      const { wixClient } = await import("@/context/wixContext");
      // The SDK's module types don't surface currentCart on the client instance.
      const wc = wixClient as unknown as WixCartClient;
      
      // Delete current Wix cart
      await wc.currentCart.deleteCurrentCart().catch(() => {});
      
      const lineItems = items
        .filter((item) => item.product.wixCatalogItemId)
        .map((item) => ({
          catalogReference: {
            appId: "215238eb-22a5-4c36-9e7b-e7c08025e04e",
            catalogItemId: item.product.wixCatalogItemId,
          },
          quantity: item.quantity,
        }));
        
      if (lineItems.length > 0) {
        await wc.currentCart.addToCurrentCart({ lineItems });
      }
    } catch (e) {
      console.error("Failed to sync cart to Wix server:", e);
    }
  }, 300);
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cartItems: [],
      isCartOpen: false,
      isCheckoutOpen: false,
      isAuthOpen: false,
      appliedCoupon: "",
      giftWrap: false,
      giftNote: "",

      addItem: (product) =>
        set((state) => {
          const existing = state.cartItems.find(
            (item) => item.product.id === product.id,
          );

          let nextItems;
          if (existing) {
            nextItems = state.cartItems.map((item) =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            );
          } else {
            nextItems = [...state.cartItems, { product, quantity: 1 }];
          }

          syncWixCart(nextItems);
          return { cartItems: nextItems };
        }),

      removeItem: (productId) =>
        set((state) => {
          const nextItems = state.cartItems.filter(
            (item) => item.product.id !== productId,
          );
          syncWixCart(nextItems);
          return { cartItems: nextItems };
        }),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          const nextItems = state.cartItems.map((item) =>
            item.product.id === productId
              ? { ...item, quantity: Math.max(1, quantity) }
              : item,
          );
          syncWixCart(nextItems);
          return { cartItems: nextItems };
        }),

      clearCart: () => {
        syncWixCart([]);
        // A cleared cart drops its coupon + gift-wrap too — they don't belong to
        // the next, empty order.
        set({ cartItems: [], appliedCoupon: "", giftWrap: false, giftNote: "" });
      },

      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      // Opening checkout closes the cart drawer so they don't stack.
      openCheckout: () => set({ isCheckoutOpen: true, isCartOpen: false }),
      closeCheckout: () => set({ isCheckoutOpen: false }),
      // Close the cart alongside: the account drawer occupies the same slot.
      openAuth: () => set({ isAuthOpen: true, isCartOpen: false }),
      closeAuth: () => set({ isAuthOpen: false }),

      setAppliedCoupon: (code) => set({ appliedCoupon: code }),
      setGiftWrap: (on) => set({ giftWrap: on }),
      setGiftNote: (note) => set({ giftNote: note }),
    }),
    {
      name: "ojara-cart",
      storage: createJSONStorage(() => localStorage),
      // Cart contents survive refreshes — never the open/closed UI state.
      partialize: (state) => ({
        cartItems: state.cartItems,
        appliedCoupon: state.appliedCoupon,
        giftWrap: state.giftWrap,
        giftNote: state.giftNote,
      }),
    },
  ),
);

/** Total number of items across all lines (primitive → safe default equality). */
export const selectTotalQuantity = (state: CartState) =>
  state.cartItems.reduce((sum, item) => sum + item.quantity, 0);

/** Total cart value in dollars. */
export const selectTotalPrice = (state: CartState) =>
  state.cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

/**
 * Hydration guard. On the first client render this returns `false` so components
 * render the same (empty) state the server produced — avoiding a mismatch — then
 * flips to `true` after mount, once the persisted cart has rehydrated from
 * localStorage (which is synchronous, so it's ready by the time the effect runs).
 */
export function useCartHydrated() {
  const [hydrated, setHydrated] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount flag for the SSR hydration guard
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
