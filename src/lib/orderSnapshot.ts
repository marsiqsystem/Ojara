// ============================================================================
// Order snapshot — what the success page shows about the order just placed.
//
// Checkout already holds every detail, so it saves a small summary in this tab's
// sessionStorage right before redirecting, keyed by the order id. The success
// page reads it back. No API returns an order to whoever holds its id, so there
// is nothing a stranger could look up; a direct visit (or another tab) simply
// gets the generic confirmation.
// ============================================================================

export interface OrderSnapshot {
  orderId: string;
  orderNumber?: string;
  placedAt: number;
  firstName: string;
  email: string;
  phoneLast4: string;
  city: string;
  paymentMethod: "COD" | "PREPAID";
  items: { name: string; quantity: number; price: number; image: string }[];
  subtotal: number;
  discount: number;
  giftWrap: boolean;
  giftWrapFee: number;
  total: number;
}

const keyFor = (orderId: string) => `ojara_order_${orderId}`;

export const saveOrderSnapshot = (snapshot: OrderSnapshot): void => {
  try {
    window.sessionStorage.setItem(keyFor(snapshot.orderId), JSON.stringify(snapshot));
  } catch {
    // Storage blocked — the success page falls back to the generic message.
  }
};

export const readOrderSnapshot = (orderId: string): OrderSnapshot | null => {
  try {
    const raw = window.sessionStorage.getItem(keyFor(orderId));
    return raw ? (JSON.parse(raw) as OrderSnapshot) : null;
  } catch {
    return null;
  }
};
