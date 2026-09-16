import type { Metadata } from "next";
import OrderConfirmation from "@/components/OrderConfirmation";
import { SUPPORT_EMAIL } from "@/lib/commerce/config";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false, follow: false },
};

// Order success. Server component; the orderId arrives as a search param from the
// checkout modal's redirect (params are a Promise in Next 16). The details come
// from the summary checkout saved in the shopper's own tab — see OrderConfirmation.
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  return <OrderConfirmation orderId={orderId} supportEmail={SUPPORT_EMAIL} />;
}
