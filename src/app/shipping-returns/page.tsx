import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

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
      updated="July 2026"
      intro="Every OJARA piece is cleansed, wrapped, and dispatched with care. Here's everything you need to know about how your order travels to you — and how exchanges work if it isn't the right fit."
      sections={[
        {
          heading: "Processing Time",
          body: [
            "Orders are prepared and energetically cleansed within 1–3 business days. During new collection launches or holidays, processing may take slightly longer — we'll always keep you informed.",
          ],
        },
        {
          heading: "Shipping Times & Costs",
          body: [
            "Domestic orders arrive within 3–7 business days. International orders typically arrive within 7–21 business days, depending on destination and customs.",
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
          heading: "Customs & Duties",
          body: [
            "International orders may be subject to import duties or taxes levied by your country. These are the responsibility of the recipient and are not included in our prices or shipping charges.",
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
