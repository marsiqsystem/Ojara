import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  alternates: { canonical: "/terms" },
  description:
    "The terms and conditions governing your use of the OJARA store.",
};

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms of Service"
      updated="July 2026"
      intro="These Terms of Service govern your access to and use of the OJARA website and your purchase of our products. Please read them carefully. By placing an order or using this site, you agree to be bound by these terms."
      sections={[
        {
          heading: "Use of the Site",
          body: [
            "You may use this website only for lawful purposes and in accordance with these terms. You agree not to use the site in any way that could damage, disable, or impair it, or interfere with any other party's use.",
            "You must be at least 18 years old, or have the consent of a parent or guardian, to make a purchase.",
          ],
        },
        {
          heading: "Products & Pricing",
          body: [
            "Our crystals and spiritual objects are natural products. Colour, shape, size, and inclusions vary from piece to piece — this is part of their character, not a defect.",
            "We make every effort to display our products and prices accurately. We reserve the right to correct any errors and to modify prices at any time before you place an order.",
          ],
        },
        {
          heading: "Metaphysical Disclaimer",
          body: [
            "OJARA products are sold as objects of intention and beauty. Any references to energy, healing, protection, or manifestation reflect traditional and spiritual beliefs and are not a substitute for professional medical, legal, or financial advice. Results are not guaranteed.",
          ],
        },
        {
          heading: "Orders & Payment",
          body: [
            "All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order. Payment must be received in full before an order is dispatched.",
          ],
        },
        {
          heading: "Returns & Exchanges",
          body: [
            "We do not offer returns or refunds. If your piece isn't the right fit, you may request an exchange within 48 hours of delivery, provided the item is unused and in its original packaging.",
            "To start an exchange, email ojara.jewel@gmail.com with your order number and a photo within 48 hours of delivery. Requests made after 48 hours cannot be accepted. Damaged or incorrect items are handled separately — see our Shipping & Exchanges page.",
          ],
        },
        {
          heading: "Intellectual Property",
          body: [
            "All content on this site — including text, imagery, logos, and design — is the property of OJARA and protected by applicable intellectual property laws. You may not reproduce or use it without our written permission.",
          ],
        },
        {
          heading: "Limitation of Liability",
          body: [
            "To the fullest extent permitted by law, OJARA shall not be liable for any indirect, incidental, or consequential damages arising from your use of the site or products. These terms are governed by the laws of the jurisdiction in which OJARA operates.",
          ],
        },
      ]}
    />
  );
}
