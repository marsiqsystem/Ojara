"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/useCartStore";
import { useWixClient } from "@/hooks/useWixClient";
import { saveOrderSnapshot } from "@/lib/orderSnapshot";
import { BRAND_NAME, SUPPORT_EMAIL } from "@/lib/commerce/config";

// ============================================================================
// PhonePe return page — where the shopper lands after paying.
//
// PhonePe doesn't reliably carry the outcome in the redirect, so we don't trust
// any query param: we replay the stashed /api/checkout payload, and the server
// proves the payment via PhonePe's Order Status API before creating the Wix
// order. The browser never decides whether the payment succeeded.
//
// The full payload (incl. the Wix checkoutId, created before the redirect) was
// stashed in localStorage keyed below, so this page needs no cart/form state —
// only to replay it, then clean up.
// ============================================================================

const STASH_KEY = "ojara_phonepe_pending";

export default function PhonePeReturnPage() {
  const router = useRouter();
  const wixClient = useWixClient();
  const clearCart = useCartStore((s) => s.clearCart);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState("Confirming your payment…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let stash: any = null;
      try {
        const raw = localStorage.getItem(STASH_KEY);
        stash = raw ? JSON.parse(raw) : null;
      } catch {
        stash = null;
      }

      if (!stash?.body) {
        setFailed(true);
        setMessage(
          "We couldn't find your checkout session on this device. If money was deducted, don't worry — contact us and we'll confirm your order. Please do NOT pay again.",
        );
        return;
      }

      const attempt = () =>
        fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stash.body),
        });

      // The shopper can land here a moment before PhonePe flips the order to
      // COMPLETED; /api/checkout returns 402 "still being confirmed" until then.
      let res = await attempt();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any = await res.json().catch(() => ({}));
      let tries = 0;
      while (
        res.status === 402 &&
        /still being confirmed/i.test(data?.error || "") &&
        tries < 4
      ) {
        await new Promise((r) => setTimeout(r, 2000));
        res = await attempt();
        data = await res.json().catch(() => ({}));
        tries += 1;
      }

      if (res.ok && data?.orderId) {
        try {
          if (stash.snapshot) {
            // The snapshot was stashed before the order existed — stamp the real
            // order id/number on it now so the success page can read it back.
            saveOrderSnapshot({
              ...stash.snapshot,
              orderId: data.orderId,
              orderNumber: data.orderNumber,
            });
          }
        } catch {}
        try {
          localStorage.removeItem(STASH_KEY);
        } catch {}
        try {
          clearCart();
        } catch {}
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (wixClient as any)?.currentCart?.deleteCurrentCart?.().catch(() => {});
        } catch {}
        router.replace(`/success?orderId=${encodeURIComponent(data.orderId)}`);
        return;
      }

      setFailed(true);
      setMessage(
        data?.error ||
          "We couldn't confirm your payment. If money was deducted, please contact us — do NOT pay again.",
      );
    })();
  }, [router, wixClient, clearCart]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center">
        {!failed ? (
          <>
            <div
              className="mx-auto mb-6 h-10 w-10 rounded-full border-2 border-midnight-navy/20 border-t-midnight-navy animate-spin"
              aria-hidden
            />
            <h1 className="text-xl font-medium text-midnight-navy">{message}</h1>
            <p className="mt-2 text-sm text-midnight-navy/60">
              Please don&apos;t close or refresh this page — this takes a few seconds.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-medium text-midnight-navy">
              Payment needs a quick check
            </h1>
            <p className="mt-3 text-sm text-midnight-navy/70">{message}</p>
            <p className="mt-4 text-sm text-midnight-navy/70">
              Reach us at{" "}
              <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>{" "}
              and we&apos;ll sort it out right away.
            </p>
            <button
              type="button"
              onClick={() => router.replace("/")}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-midnight-navy px-6 py-3 text-sm font-medium text-white"
            >
              Back to {BRAND_NAME}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
