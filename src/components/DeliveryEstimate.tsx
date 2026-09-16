"use client";

import { useEffect, useState } from "react";
import {
  MAX_DELIVERY_BUSINESS_DAYS,
  MIN_DELIVERY_BUSINESS_DAYS,
  deliveryWindowLabel,
} from "@/lib/deliveryEstimate";

/**
 * "Order now, get it Sat, 20 Sept – Mon, 29 Sept". The dates depend on the
 * shopper's clock, so they fill in after hydration; the server renders the plain
 * business-day range.
 */
export default function DeliveryEstimate() {
  const [range, setRange] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-clock read after hydration
  useEffect(() => setRange(deliveryWindowLabel()), []);

  return (
    <p className="text-sm text-midnight-navy/80">
      {range ? (
        <>
          Order now, get it <span className="font-semibold text-midnight-navy">{range}</span>
        </>
      ) : (
        <>
          Delivered in{" "}
          <span className="font-semibold text-midnight-navy">
            {MIN_DELIVERY_BUSINESS_DAYS}–{MAX_DELIVERY_BUSINESS_DAYS} business days
          </span>
        </>
      )}
    </p>
  );
}
