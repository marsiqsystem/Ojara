"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import { readOrderSnapshot, type OrderSnapshot } from "@/lib/orderSnapshot";
import { deliveryWindowLabel, dispatchTimeline } from "@/lib/deliveryEstimate";
import { whatsappLink } from "@/lib/commerce/config";

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <li className="flex gap-3">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-champagne-gold/20 text-xs font-bold text-midnight-navy">
      {n}
    </span>
    <div>
      <p className="text-sm font-semibold text-midnight-navy">{title}</p>
      <p className="mt-0.5 text-[0.82rem] leading-snug text-midnight-navy/65">{children}</p>
    </div>
  </li>
);

/**
 * The order confirmation (the Viora success page, minus what OJARA doesn't have
 * yet). Reads the summary checkout saved in this tab (lib/orderSnapshot.ts):
 * a warm thank-you, what to keep ready for COD, the delivery dates, what happens
 * next, the pieces, and where to get help. Without a snapshot (a direct visit or
 * another tab) it shows the generic confirmation — never someone else's order.
 */
export default function OrderConfirmation({
  orderId,
  supportEmail,
}: {
  orderId?: string;
  /** Passed from the server — SUPPORT_EMAIL reads a server-only env var. */
  supportEmail: string;
}) {
  const [snapshot, setSnapshot] = useState<OrderSnapshot | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // sessionStorage and the shopper's clock only exist client-side.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot read after hydration
    setSnapshot(orderId ? readOrderSnapshot(orderId) : null);
    setReady(true);
  }, [orderId]);

  const ref = snapshot?.orderNumber || (orderId ? `#${orderId.slice(-8).toUpperCase()}` : "");
  const helpHref = whatsappLink(`Hi OJARA, I have a question about my order ${ref}`);
  const isCod = snapshot?.paymentMethod !== "PREPAID";

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      {/* Confirmation */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="mt-4 text-xs uppercase tracking-[0.35em] text-champagne-gold">Order confirmed</p>
        <h1 className="mt-3 font-heading text-3xl text-midnight-navy sm:text-4xl">
          {snapshot?.firstName ? `Thank you, ${snapshot.firstName}!` : "Thank you ✦"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-midnight-navy/75">
          {snapshot
            ? `Your order ${ref} is placed. A confirmation is on its way to ${snapshot.email}.`
            : "Your order is placed and a confirmation is on its way to your email."}
        </p>
        {ready && snapshot && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-800">
            🚚 Arriving {deliveryWindowLabel(new Date(snapshot.placedAt))}
          </p>
        )}
        {!snapshot && ref && (
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-midnight-navy/60">
            Order reference: <span className="font-semibold text-midnight-navy">{ref}</span>
          </p>
        )}
      </div>

      {snapshot && (
        <>
          {/* What to keep ready — COD buyers who are ready at the door don't refuse. */}
          <div className="mt-8 rounded-2xl border border-champagne-gold/40 bg-champagne-gold/10 p-4 text-center">
            {isCod ? (
              <>
                <p className="text-[0.7rem] font-bold uppercase tracking-wider text-midnight-navy/70">Cash on Delivery</p>
                <p className="mt-1 text-lg font-bold text-midnight-navy">
                  Keep {formatPrice(snapshot.total)} ready
                </p>
                <p className="mt-1 text-sm text-midnight-navy/65">Pay the courier in cash when your order arrives.</p>
              </>
            ) : (
              <>
                <p className="text-[0.7rem] font-bold uppercase tracking-wider text-emerald-700">Paid online</p>
                <p className="mt-1 text-lg font-bold text-midnight-navy">{formatPrice(snapshot.total)} paid — nothing to pay at the door</p>
              </>
            )}
          </div>

          {/* What happens next */}
          <section className="mt-8 rounded-2xl border border-champagne-gold/25 bg-white/60 p-5">
            <h2 className="font-heading text-xl text-midnight-navy">What happens next</h2>
            <ol className="mt-4 space-y-4">
              <Step n={1} title="Confirmation email">
                Sent to {snapshot.email}. Check your spam folder if it isn&apos;t in your inbox.
              </Step>
              <Step n={2} title={`Packed & shipped ${dispatchTimeline(new Date(snapshot.placedAt)).shipLabel.toLowerCase()}`}>
                Your pieces are cleansed and packed with care. Orders before 8 pm ship the
                same day (Monday–Saturday).
              </Step>
              <Step n={3} title="Shipped">
                You&apos;ll get an email with your tracking number as soon as it ships.
              </Step>
              <Step n={4} title={`Delivered to ${snapshot.city || "you"}`}>
                Expected {deliveryWindowLabel(new Date(snapshot.placedAt))}. The courier may call
                your number ending {snapshot.phoneLast4}.
              </Step>
            </ol>
          </section>

          {/* Order summary */}
          <section className="mt-8 rounded-2xl border border-champagne-gold/25 bg-white/60 p-5">
            <h2 className="font-heading text-xl text-midnight-navy">Your order {ref}</h2>
            <ul className="mt-3 divide-y divide-midnight-navy/10">
              {snapshot.items.map((item, i) => (
                <li key={`${item.name}-${i}`} className="flex items-center gap-3 py-3">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-sand">
                    <Image src={item.image} alt="" fill sizes="56px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 block text-sm text-midnight-navy">{item.name}</span>
                    <span className="text-xs text-midnight-navy/55">Qty {item.quantity}</span>
                  </span>
                  <span className="text-sm font-medium tabular-nums text-midnight-navy">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 space-y-1.5 border-t border-midnight-navy/10 pt-3 text-sm">
              <div className="flex justify-between text-midnight-navy/70">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPrice(snapshot.subtotal)}</span>
              </div>
              {snapshot.discount > 0 && (
                <div className="flex justify-between font-medium text-emerald-700">
                  <span>Savings</span>
                  <span className="tabular-nums">− {formatPrice(snapshot.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-midnight-navy/70">
                <span>Delivery</span>
                <span className="font-semibold text-emerald-700">FREE</span>
              </div>
              <div className="flex justify-between border-t border-midnight-navy/10 pt-2 text-base font-bold text-midnight-navy">
                <span>{isCod ? "To pay on delivery" : "Paid"}</span>
                <span className="tabular-nums">{formatPrice(snapshot.total)}</span>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Help + next */}
      <div className="mt-8 text-center">
        <p className="text-sm text-midnight-navy/70">
          Questions about your order?{" "}
          {helpHref ? (
            <a href={helpHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline underline-offset-2">
              Chat with us on WhatsApp
            </a>
          ) : (
            <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Order ${ref}`)}`} className="font-semibold text-midnight-navy underline underline-offset-2">
              Email {supportEmail}
            </a>
          )}
        </p>
        <Link
          href="/collection"
          className="mt-6 inline-block rounded-full bg-midnight-navy px-10 py-3.5 text-xs font-bold uppercase tracking-[0.25em] text-champagne-gold transition-all hover:bg-midnight-navy/90 active:scale-95"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
