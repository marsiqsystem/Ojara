"use client";

import { useState } from "react";

export default function PincodeEstimator() {
  const [pincode, setPincode] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const checkDelivery = () => {
    if (/^\d{6}$/.test(pincode)) {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 4);
      const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
      const formattedDate = deliveryDate.toLocaleDateString("en-IN", options);
      setStatus(`✦ Delivery by ${formattedDate}`);
    } else {
      setStatus("Please enter a valid 6-digit pincode.");
    }
  };

  return (
    <div className="mt-8 border-t border-champagne-gold/20 pt-6">
      <span className="block text-xs uppercase tracking-[0.2em] text-midnight-navy/85">
        Delivery Estimator
      </span>
      <div className="mt-3 flex max-w-sm items-center gap-2">
        <input
          type="text"
          maxLength={6}
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, ""));
            setStatus(null);
          }}
          placeholder="Enter pincode (e.g. 110001)"
          className="flex-1 rounded-md border border-midnight-navy/30 bg-transparent px-4 py-3 text-sm text-midnight-navy placeholder:text-midnight-navy/60 focus:outline-none focus:border-midnight-navy focus:ring-1 focus:ring-midnight-navy"
        />
        <button
          type="button"
          onClick={checkDelivery}
          className="cursor-pointer text-sm font-semibold tracking-wide text-champagne-gold transition-colors duration-150 hover:text-midnight-navy active:scale-95 px-4 py-2.5"
        >
          Check
        </button>
      </div>
      {status && (
        <p className={`mt-3 text-xs tracking-wide ${status.startsWith("✦") ? "text-champagne-gold font-medium animate-fade-in-up" : "text-red-500"}`}>
          {status}
        </p>
      )}
    </div>
  );
}
