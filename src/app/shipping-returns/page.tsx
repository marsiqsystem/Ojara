import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";
import { COMMERCE_FACTS } from "@/lib/seo";
import { DISPATCH_POLICY_TEXT } from "@/lib/deliveryEstimate";
import { PROPRIETOR_NAME, SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/commerce/config";

const {
  handlingDaysMax,
  transitDaysMin,
  transitDaysMax,
  refundDaysMin,
  refundDaysMax,
  replacementDaysMin,
  replacementDaysMax,
} = COMMERCE_FACTS;

// Order to doorstep: same-day or next-working-day dispatch, then transit.
const deliveryMin = transitDaysMin;
const deliveryMax = transitDaysMax + handlingDaysMax;
const REACH_US = `email ${SUPPORT_EMAIL} or call us on ${SUPPORT_PHONE}`;

export const metadata: Metadata = {
  title: "Shipping, Returns & Refunds",
  alternates: { canonical: "/shipping-returns" },
  description: `Free shipping on prepaid orders, delivered in ${deliveryMin}–${deliveryMax} working days. 48-hour exchange; returns and refunds for damaged or wrong items, refunded in ${refundDaysMin}–${refundDaysMax} business days.`,
};

// Policy (client, 2026-11-16): change of mind → 48-hour exchange only; damaged,
// defective or wrong pieces → replacement or refund. The day counts live in
// COMMERCE_FACTS (lib/seo.ts) so this page, the FAQ and the schema agree.
export default function ShippingReturnsPage() {
  return (
    <PolicyPage
      title="Shipping, Returns & Refunds"
      updated="November 2026"
      intro="Every OJARA piece is checked, wrapped, and dispatched with care. Here's how your order travels to you, how long it takes, and how exchanges, returns and refunds work."
      sections={[
        {
          heading: "Delivery Time Frame",
          body: [
            `Orders are delivered within ${deliveryMin}–${deliveryMax} working days of being placed.`,
            DISPATCH_POLICY_TEXT,
            `After dispatch, your order takes ${transitDaysMin}–${transitDaysMax} business days to reach you. On public holidays dispatch may move to the next working day — we'll always keep you informed.`,
          ],
        },
        {
          heading: "Shipping Costs",
          body: [
            "We ship within India only — we don't deliver internationally.",
            "Shipping is free on all prepaid (online) orders, with no minimum spend. Cash on Delivery adds a ₹49 delivery & handling fee.",
          ],
        },
        {
          heading: "Tracking Your Order",
          body: [
            "Once your order ships, you'll receive a confirmation email with a tracking number so you can follow it to your door.",
          ],
        },
        {
          heading: "48-Hour Exchange Policy",
          body: [
            "If a gemstone piece isn't the right fit, you may request an exchange within 48 hours of delivery. Items must be unused and in their original packaging.",
            `To request an exchange, ${REACH_US} with your order number and a photo within 48 hours of delivery, and we'll guide you through the process.`,
            `The exchange/replacement product will be delivered within ${replacementDaysMin}–${replacementDaysMax} days.`,
            "Earrings and jewellery sets (OJARA Adorn): for hygiene, these can't be exchanged for a change of mind. If one arrives damaged or isn't what you ordered, it is replaced or refunded as below.",
          ],
        },
        {
          heading: "Returns",
          body: [
            "We accept returns only when a piece arrives damaged, defective, or isn't what you ordered. We don't accept returns for a change of mind — please use the 48-hour exchange instead.",
            `Report the problem within 48 hours of delivery: ${REACH_US} with your order number, photos and your unboxing video.`,
            "Once we approve the return, we'll arrange the pickup or share the return address. The piece must be unused and in its original packaging, with everything it came with. Return shipping for a damaged or wrong item is free.",
            `You can choose a replacement or a refund. A replacement is delivered within ${replacementDaysMin}–${replacementDaysMax} days of the return being approved.`,
          ],
        },
        {
          heading: "Refunds",
          body: [
            "Refunds are given for approved returns (a damaged, defective or wrong piece) and for orders cancelled before dispatch.",
            `Once your return is approved, the refund is processed within ${refundDaysMin}–${refundDaysMax} business days. Prepaid orders are refunded to the original payment method (UPI, card or net banking). Cash on Delivery orders are refunded by UPI or bank transfer to the details you share with us.`,
            "After we process it, your bank or card issuer may take a few more working days to show the amount in your account.",
            "Prepaid orders ship free, so there are no prepaid shipping charges to deduct.",
          ],
        },
        {
          heading: "Cancellations",
          body: [
            `You can cancel an order before it is dispatched — ${REACH_US} with your order number as soon as possible. Orders placed before 8 pm usually ship the same day, so please contact us quickly. Once an order has shipped, it can't be cancelled; the policies above apply after delivery.`,
            `A cancelled prepaid order is refunded within ${refundDaysMin}–${refundDaysMax} business days to the original payment method.`,
          ],
        },
        {
          heading: "Contact",
          body: [
            `OJARA (proprietor: ${PROPRIETOR_NAME}) · Phone: ${SUPPORT_PHONE} · Email: ${SUPPORT_EMAIL}`,
            "9/D, New Panchanantala Road, Police Station & Post Office — Belgharia, Kolkata – 700 056, West Bengal, India.",
          ],
        },
      ]}
    />
  );
}
