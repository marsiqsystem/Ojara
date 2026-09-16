import { COMMERCE_FACTS } from "@/lib/seo";

// ============================================================================
// Delivery dates — "Order now, get it Sat, 20 Sept – Mon, 29 Sept".
//
// Built from the shipping policy's own numbers (COMMERCE_FACTS: handling +
// transit business days), so the product page, the shipping page, Google's
// structured data and the Merchant feed all make the same promise. Sundays don't
// count. A date is far more persuasive than "6–7 days" — and it replaces that
// figure, which contradicted the policy.
// ============================================================================

export const MIN_DELIVERY_BUSINESS_DAYS =
  COMMERCE_FACTS.handlingDaysMin + COMMERCE_FACTS.transitDaysMin;
export const MAX_DELIVERY_BUSINESS_DAYS =
  COMMERCE_FACTS.handlingDaysMax + COMMERCE_FACTS.transitDaysMax;

const addBusinessDays = (from: Date, days: number): Date => {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++;
  }
  return d;
};

const formatDay = (d: Date) =>
  d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

/** e.g. "Sat, 20 Sept – Mon, 29 Sept". Uses the shopper's clock — call client-side. */
export const deliveryWindowLabel = (now: Date = new Date()): string =>
  `${formatDay(addBusinessDays(now, MIN_DELIVERY_BUSINESS_DAYS))} – ${formatDay(
    addBusinessDays(now, MAX_DELIVERY_BUSINESS_DAYS),
  )}`;
