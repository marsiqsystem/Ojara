import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";
import { COMMERCE_FACTS } from "@/lib/seo";
import { DISPATCH_POLICY_TEXT } from "@/lib/deliveryEstimate";

export const metadata: Metadata = {
  title: "Shipping & Exchanges",
  alternates: { canonical: "/shipping-returns" },
  description:
    "Free shipping on every order, plus our 48-hour exchange policy.",
};

export default function ShippingReturnsPage() {
  return (
    <PolicyPage
      title="Shipping & Exchanges"
      updated="September 2026"
      intro="Every OJARA piece is cleansed, wrapped, and dispatched with care. Here's everything you need to know about how your order travels to you — and how exchanges work if it isn't the right fit."
      sections={[
        {
          heading: "Processing Time",
          body: [
            DISPATCH_POLICY_TEXT,
            "Each piece is cleansed and packed with care before it leaves us. On public holidays dispatch may move to the next working day — we'll always keep you informed.",
          ],
        },
        {
          heading: "Shipping Times & Costs",
          body: [
            `We ship within India only — we don't deliver internationally. Orders arrive ${COMMERCE_FACTS.transitDaysMin}–${COMMERCE_FACTS.transitDaysMax} business days after dispatch.`,
            "Shipping is complimentary on every order — always free, with no minimum spend. Expedited options are available where offered.",
          ],
        },
        {
          heading: "Tracking Your Order",
          body: [
            "Once your order ships, you'll receive a confirmation email with a tracking number so you can follow your piece on its journey to you.",
          ],
        },
        {
          heading: "48-Hour Exchange Policy",
          body: [
            "We do not offer returns or refunds. If your piece isn't the right fit, you may request an exchange within 48 hours of delivery. Items must be unused and in their original packaging.",
            "To request an exchange, email ojara.jewel@gmail.com with your order number and a photo within 48 hours of delivery, and we'll guide you through the process.",
          ],
        },
        {
          heading: "Damaged or Incorrect Items",
          body: [
            "We inspect every piece before it leaves us, but crystals are delicate. If your order arrives damaged or you received the wrong item, contact us within 7 days with a photo and we'll make it right at no cost to you.",
          ],
        },
      ]}
    />
  );
}
