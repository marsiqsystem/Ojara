"use client";

import { useEffect, useState } from "react";
import { dispatchTimeline, type DispatchTimeline as Timeline } from "@/lib/deliveryEstimate";

const icon = (d: string) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const STEPS = {
  ordered: "M6 7h12l-1 13H7L6 7ZM9 7a3 3 0 0 1 6 0",
  shipped: "M10 17h4V5H2v12h3M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1M7.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  delivered: "M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8",
};

const countdown = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} hr${h === 1 ? "" : "s"} ${m} min` : `${m} min`;
};

/**
 * "Order within 3 hrs 12 min to ship today", then Ordered → Shipped → Delivered
 * with real dates. The countdown runs to the actual 8 pm IST packing cut-off (see
 * lib/deliveryEstimate.ts), so it is only shown when today's dispatch is still
 * catchable — never a timer that resets. Dates depend on the clock, so they
 * render after hydration.
 */
export default function DeliveryTimeline() {
  const [timeline, setTimeline] = useState<Timeline | null>(null);

  useEffect(() => {
    const tick = () => setTimeline(dispatchTimeline());
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!timeline) {
    return <p className="text-sm text-midnight-navy/70">Free delivery across India · Cash on Delivery</p>;
  }

  const { shipLabel, deliveryLabel, minutesToCutoff } = timeline;
  const steps = [
    { key: "ordered", label: "Ordered", when: "Today", d: STEPS.ordered },
    { key: "shipped", label: "Shipped", when: shipLabel, d: STEPS.shipped },
    { key: "delivered", label: "Delivered", when: deliveryLabel, d: STEPS.delivered },
  ];

  return (
    <div>
      <p className="text-sm text-midnight-navy/80">
        {minutesToCutoff !== null ? (
          <>
            Order within{" "}
            <span className="font-semibold text-champagne-gold">{countdown(minutesToCutoff)}</span> to ship{" "}
            <span className="font-semibold text-midnight-navy">today</span>
          </>
        ) : (
          <>
            Order now — ships <span className="font-semibold text-midnight-navy">{shipLabel.toLowerCase() === "tomorrow" ? "tomorrow" : shipLabel}</span>
          </>
        )}
      </p>
      <ol className="mt-3 grid grid-cols-3 items-start">
        {steps.map((step, i) => (
          <li key={step.key} className="relative flex flex-col items-center text-center">
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-5 w-full border-t border-dashed border-champagne-gold/60"
              />
            )}
            <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-champagne-gold/15 text-midnight-navy">
              {icon(step.d)}
            </span>
            <span className="mt-1.5 text-xs font-semibold text-midnight-navy">{step.label}</span>
            <span className="text-[0.68rem] leading-tight text-midnight-navy/60">{step.when}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
