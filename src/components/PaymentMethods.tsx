import Image from "next/image";
import { PREPAID_ENABLED } from "@/lib/commerce/config";

// Only methods checkout actually accepts. Online methods appear the moment
// prepaid is switched on (Razorpay live keys); until then it's Cash on Delivery.
const ONLINE = [
  { src: "/upi.png", alt: "UPI" },
  { src: "/rupay.png", alt: "RuPay" },
  { src: "/visa.png", alt: "Visa" },
  { src: "/mastercard.png", alt: "Mastercard" },
];

/** Payment logos under the buy buttons — the reference PDP's reassurance row. */
export default function PaymentMethods({ className = "" }: { className?: string }) {
  const methods = [
    { src: "/cash-on-delivery.png", alt: "Cash on Delivery" },
    ...(PREPAID_ENABLED ? ONLINE : []),
  ];

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      {methods.map((m) => (
        <span key={m.alt} className="flex h-8 w-12 items-center justify-center rounded-md border border-midnight-navy/10 bg-white px-1.5">
          <Image src={m.src} alt={m.alt} width={40} height={24} className="h-auto max-h-6 w-auto object-contain" />
        </span>
      ))}
      <span className="text-[0.7rem] text-midnight-navy/55">
        {PREPAID_ENABLED ? "Secure payments" : "Pay in cash when it arrives"}
      </span>
    </div>
  );
}
