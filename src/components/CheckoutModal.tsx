"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useCartStore } from "@/lib/store/useCartStore";
import { useWixClient } from "@/hooks/useWixClient";
import { formatPrice } from "@/lib/format";
import {
  computeTotals,
  PREPAID_DISCOUNT,
  GIFT_WRAP_FEE,
} from "@/lib/commerce/pricing";
import { useLiveCoupon, type CouponLine } from "@/lib/commerce/useLiveCoupon";
import { WIX_ENABLED, BRAND_NAME } from "@/lib/commerce/config";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import { trackEvent, trackingContext } from "@/lib/analytics/capi";
import { contentIds, toContents, toGa4Items } from "@/lib/analytics/content";
import SacredUpsellFlow, {
  type SacredUpsellSelection,
} from "@/components/SacredUpsellFlow";
import { pickUpsellProducts } from "@/lib/commerce/bundle";
import type { Product } from "@/lib/mockData";

type PaymentMethod = "PREPAID" | "COD";

// ---------------------------------------------------------------------------
// PREPAID KILL SWITCH — off while we're COD-only.
//
// TODO(owner): flip to `true` to bring prepaid back. Nothing below was deleted:
// the Razorpay order -> widget -> verify-signature -> discount-reconciliation
// path is intact and still typechecks, so restoring is this one line (plus the
// RAZORPAY_* keys in .env.local, which RAZORPAY_ENABLED already gates server-side).
//
// While false: the "Pay Online" option renders disabled as "Coming soon", COD is
// the only selectable method, and the −₹50 prepaid incentive is hidden — quoting
// a discount for a method nobody can choose would just be a broken promise.
// ---------------------------------------------------------------------------
const PREPAID_ENABLED = false;

// ---------------------------------------------------------------------------
// SACRED UPSELL ("Complete Your Chakra") KILL SWITCH — off while it's unfinished.
//
// The whole SacredUpsellFlow (checkout step 2) is hidden from shoppers while
// false: checkout runs Contact -> Delivery & Payment with no bundle step, and
// the step counter reads "of 2". Nothing was deleted — the component, pricing,
// and the Wix bundled-order path all still typecheck. Flip to `true` to bring
// the chakra bundle step back once it's complete and the Wix path is tested.
// ---------------------------------------------------------------------------
const UPSELL_ENABLED = false;

// ISO 3166-2 subdivision codes — Wix requires the CODE, not free text.
const IN_STATES: { code: string; name: string }[] = [
  { code: "IN-AP", name: "Andhra Pradesh" },
  { code: "IN-AS", name: "Assam" },
  { code: "IN-BR", name: "Bihar" },
  { code: "IN-CT", name: "Chhattisgarh" },
  { code: "IN-DL", name: "Delhi" },
  { code: "IN-GA", name: "Goa" },
  { code: "IN-GJ", name: "Gujarat" },
  { code: "IN-HR", name: "Haryana" },
  { code: "IN-HP", name: "Himachal Pradesh" },
  { code: "IN-JH", name: "Jharkhand" },
  { code: "IN-KA", name: "Karnataka" },
  { code: "IN-KL", name: "Kerala" },
  { code: "IN-MP", name: "Madhya Pradesh" },
  { code: "IN-MH", name: "Maharashtra" },
  { code: "IN-OR", name: "Odisha" },
  { code: "IN-PB", name: "Punjab" },
  { code: "IN-RJ", name: "Rajasthan" },
  { code: "IN-TN", name: "Tamil Nadu" },
  { code: "IN-TG", name: "Telangana" },
  { code: "IN-UP", name: "Uttar Pradesh" },
  { code: "IN-UT", name: "Uttarakhand" },
  { code: "IN-WB", name: "West Bengal" },
];

// Razorpay ships no npm checkout SDK — inject the script on demand.
const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function CheckoutModal() {
  const router = useRouter();
  const wixClient = useWixClient();
  const cartItems = useCartStore((s) => s.cartItems);
  const clearCart = useCartStore((s) => s.clearCart);
  const open = useCartStore((s) => s.isCheckoutOpen);
  const onClose = useCartStore((s) => s.closeCheckout);
  // Coupon + gift-wrap come from the cart (set in the drawer); the checkout is a
  // read-through so the shopper sees the same numbers they saw in the cart.
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const setAppliedCoupon = useCartStore((s) => s.setAppliedCoupon);
  const giftWrap = useCartStore((s) => s.giftWrap);
  const giftNote = useCartStore((s) => s.giftNote);

  // 1 contact → 2 sacred bundle upsell → 3 delivery & payment. The upsell is
  // skipped outright when there's nothing relevant left to offer.
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [upsell, setUpsell] = useState<SacredUpsellSelection>({
    items: [],
    discount: 0,
  });
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  // COD by default: pre-keys it completes the full mock order + email flow. The
  // prepaid −₹50 optics show the moment the shopper switches to "Pay Online".
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  // Coupon — the applied code lives on the cart store; only the input box and its
  // error are local to this modal.
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");

  // Fire-once guards for the funnel-step Meta events, so re-rendering or stepping
  // back and forth doesn't emit duplicates. Reset in completeOrder() so a second
  // order in the same session tracks again.
  //
  // CompleteRegistration used to fire here too, on a valid email. It was removed:
  // OJARA has no registration, so it was a duplicate of InitiateCheckout under a
  // misleading name, and it made four Meta events fire for one Buy Now click —
  // which is why AddToCart, InitiateCheckout, AddPaymentInfo and
  // CompleteRegistration all read exactly 6 in Events Manager.
  const checkoutTracked = useRef(false);
  const paymentInfoTracked = useRef(false);

  const giftWrapFee = giftWrap ? GIFT_WRAP_FEE : 0;

  // Normalised cart lines — the seam. Today from the local store; when the Wix
  // cart takes over (Phase 2) this maps the Wix lineItems to the same shape.
  // Bundle picks ride alongside the cart as ordinary lines, so they are priced,
  // emailed, and pushed to the Wix cart by exactly the same code path. Their
  // discount travels separately as `bundleDiscount` — see lib/commerce/bundle.ts.
  const lines = useMemo(
    () =>
      [
        ...cartItems.map((ci) => ({
          product: ci.product,
          quantity: ci.quantity,
        })),
        ...upsell.items.map((product) => ({ product, quantity: 1 })),
      ].map(({ product, quantity }) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.image,
        wixCatalogItemId: product.wixCatalogItemId,
      })),
    [cartItems, upsell.items],
  );

  // Live coupon — validated against Wix's engine (mirror fallback if unreachable).
  // `couponDiscount` recomputes as the cart/upsell changes, so a % code stays
  // correct on the final subtotal. `email` lets Wix enforce single-use-per-buyer.
  const couponLines = useMemo<CouponLine[]>(
    () =>
      lines.map((l) => ({
        id: l.id,
        name: l.name,
        price: l.price,
        quantity: l.quantity,
        wixCatalogItemId: l.wixCatalogItemId,
      })),
    [lines],
  );
  const {
    discount: couponDiscount,
    pending: couponPending,
    apply: applyCouponLive,
    remove: removeCouponLive,
  } = useLiveCoupon(couponLines, email.trim() || undefined, (reason) =>
    toast(
      reason === "empty" || reason === "no-priced-lines"
        ? "Coupon removed — your bag changed."
        : "That coupon is no longer valid for this order.",
    ),
  );

  const isPrepaid = paymentMethod === "PREPAID";
  const totals = useMemo(
    () =>
      computeTotals({
        lines,
        isPrepaid,
        // The hook already resolved the authoritative ₹ (Wix or mirror fallback);
        // feed it straight in rather than letting computeTotals re-derive it.
        wixReportedDiscount: couponDiscount,
        giftWrapFee,
        bundleDiscount: upsell.discount,
      }),
    [lines, isPrepaid, couponDiscount, giftWrapFee, upsell.discount],
  );

  // Primary item = the highest-value thing in the cart. That's what the ritual
  // is built around, so it's what the suggestions are matched against.
  const primaryProduct = useMemo(
    () =>
      cartItems.reduce<Product | undefined>(
        (best, ci) =>
          !best || ci.product.price > best.price ? ci.product : best,
        undefined,
      ),
    [cartItems],
  );

  const cartIds = useMemo(
    () => cartItems.map((ci) => ci.product.id),
    [cartItems],
  );

  const upsellSuggestions = useMemo(
    () =>
      UPSELL_ENABLED ? pickUpsellProducts(primaryProduct, catalog, cartIds) : [],
    [primaryProduct, catalog, cartIds],
  );

  // Lock scroll (Lenis-aware) while open, and close on Escape.
  useEffect(() => {
    if (!open) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [open, onClose]);

  // Catalogue for the upsell step. Fetched once the modal opens rather than at
  // mount, so a shopper who never checks out never pays for the request.
  useEffect(() => {
    // No upsell step → no need to load the catalogue for suggestions.
    if (!UPSELL_ENABLED || !open || catalog.length) return;
    let cancelled = false;
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Product[]) => {
        if (!cancelled && Array.isArray(list)) setCatalog(list);
      })
      // A failed catalogue load must never block checkout — the upsell step
      // simply doesn't appear.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, catalog.length]);

  // InitiateCheckout — fired once, here, the moment the checkout actually opens.
  // Every entry point (cart drawer "Checkout", desktop Buy Now, mobile sticky Buy
  // Now) routes through openCheckout(), so this is the single place that can see
  // all of them, and it reads the real cart totals rather than one product's.
  useEffect(() => {
    if (!open) {
      checkoutTracked.current = false;
      return;
    }
    if (checkoutTracked.current || !lines.length) return;
    checkoutTracked.current = true;

    trackEvent("InitiateCheckout", {
      customData: {
        currency: "INR",
        value: totals.total,
        num_items: lines.reduce((n, l) => n + l.quantity, 0),
        content_ids: contentIds(lines),
        contents: toContents(lines),
        content_type: "product",
      },
      items: toGa4Items(lines),
    });
    // `lines`/`totals` are read, not tracked: the guard above makes this fire at
    // most once per open, and re-running as the cart changes is a no-op.
  }, [open, lines, totals.total]);

  // Entering the delivery & payment step. Both paths into step 3 (skip-upsell and
  // the upsell's Continue) funnel through here.
  //
  // AddPaymentInfo is NOT fired here any more — merely landing on the form is the
  // same shopper state InitiateCheckout already reports. It now fires from
  // handlePayment(), once the delivery details validate and the order is actually
  // submitted, which is a genuinely distinct funnel step.
  const enterPaymentStep = () => {
    setStep(3);
  };

  const goToStep2 = () => {
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    // Nothing worth offering → don't stand a dead step between the shopper and
    // the delivery form.
    if (upsellSuggestions.length) {
      setStep(2);
    } else {
      enterPaymentStep();
    }
  };

  const validateDelivery = (): string => {
    if (!fullName.trim()) return "Please enter your full name.";
    if (!address.trim()) return "Please enter your address.";
    if (!pincode.trim() || !/^\d{6}$/.test(pincode.trim()))
      return "Please enter a valid 6-digit pincode.";
    if (!city.trim()) return "Please enter your city.";
    if (!stateCode) return "Please select your state.";
    if (mobile.replace(/\D/g, "").length !== 10)
      return "Phone must be exactly 10 digits (remove any country code).";
    return "";
  };

  const handleApplyCoupon = async () => {
    const { ok, error: cErr } = await applyCouponLive(couponInput);
    if (ok) {
      setCouponError("");
      setCouponInput("");
      toast.success("✦ Coupon applied.");
    } else {
      setCouponError(cErr || "That code isn’t valid.");
    }
  };

  const handleRemoveCoupon = () => {
    removeCouponLive();
    setCouponError("");
  };

  // Build the item + summary payload the email renderer needs (mock mode) and the
  // Wix email step mirrors (live mode).
  const buildOrderPayload = () => {
    const stateName = IN_STATES.find((s) => s.code === stateCode)?.name || stateCode;
    return {
      items: lines.map((l) => ({
        name: l.name,
        quantity: l.quantity,
        unitPrice: String(l.price),
        lineTotal: String(l.price * l.quantity),
        image: l.image,
      })),
      summary: {
        subtotal: String(totals.subtotal),
        shipping: "0",
        discount: String(
          totals.couponDiscount + totals.prepaidDiscount + totals.bundleDiscount,
        ),
        giftWrap: giftWrapFee ? String(giftWrapFee) : undefined,
        total: String(totals.total),
      },
      amount: totals.total.toFixed(2),
      couponCode: appliedCoupon || undefined,
      bundleDiscount: totals.bundleDiscount || undefined,
      giftWrap,
      giftNote: giftWrap ? giftNote.trim() || undefined : undefined,
      stateName,
    };
  };

  // Turn the cart into an order via /api/checkout. Mock mode sends items+summary;
  // live mode first materialises a Wix checkout from the current cart.
  const finalizeOrder = async (
    method: PaymentMethod,
    razorpayPaymentId?: string,
  ): Promise<{ orderId: string }> => {
    const payload = buildOrderPayload();

    let checkoutId: string | undefined;
    if (WIX_ENABLED) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wc = wixClient as any;
      const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";
      const lineItems = lines
        .filter((l) => l.wixCatalogItemId)
        .map((l) => ({
          catalogReference: {
            appId: WIX_STORES_APP_ID,
            catalogItemId: l.wixCatalogItemId,
          },
          quantity: l.quantity,
        }));
      if (lineItems.length) {
        await wc.currentCart.deleteCurrentCart().catch(() => {});
        await wc.currentCart.addToCurrentCart({ lineItems });
      }
      // Apply the coupon natively so Wix's engine computes the discount and it
      // shows on the resulting order. Best-effort: if Wix rejects the code, the
      // order still proceeds (the local mirror already reflected the discount).
      if (appliedCoupon) {
        try {
          await wc.currentCart.updateCurrentCart({ couponCode: appliedCoupon });
        } catch (couponErr) {
          console.error("Wix rejected coupon", appliedCoupon, couponErr);
        }
      }
      const checkoutResult = await wc.currentCart.createCheckoutFromCurrentCart({
        channelType: "WEB",
      });
      checkoutId = checkoutResult?.checkoutId;
      if (!checkoutId) throw new Error("Wix returned an empty checkoutId.");
    }

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkoutId,
        details: {
          email: email.trim(),
          fullName: fullName.trim(),
          phone: mobile.replace(/\D/g, ""),
          addressLine1: address.trim(),
          addressLine2: addressLine2.trim(),
          city: city.trim(),
          state: stateCode,
          postalCode: pincode.trim(),
          paymentMethod: method,
          razorpayPaymentId,
          razorpayAmount: method === "PREPAID" ? totals.total.toFixed(2) : undefined,
        },
        items: payload.items,
        summary: payload.summary,
        amount: payload.amount,
        couponCode: payload.couponCode,
        bundleDiscount: payload.bundleDiscount,
        giftWrap: payload.giftWrap,
        giftNote: payload.giftNote,
        // Lets the server fire its own Meta Purchase the moment the order
        // exists, so an ad-blocked or closed browser still reports the
        // conversion. It reuses event_id `purchase-<orderId>`, the same id the
        // browser Purchase above uses, so Meta counts ONE conversion.
        tracking: {
          ...trackingContext(),
          contentIds: contentIds(lines),
          contents: toContents(lines),
          numItems: lines.reduce((n, l) => n + l.quantity, 0),
          value: totals.total,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Order creation failed.");
    if (!data.orderId) throw new Error("No order ID was returned.");
    return { orderId: data.orderId };
  };

  const completeOrder = (orderId: string) => {
    // Fire Purchase BEFORE clearCart wipes the totals. eventId = orderId so the
    // browser Pixel (via GTM) and the server CAPI event de-duplicate.
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    trackEvent("Purchase", {
      eventId: `purchase-${orderId}`,
      customData: {
        currency: "INR",
        value: totals.total,
        content_ids: contentIds(lines),
        contents: toContents(lines),
        content_type: "product",
        num_items: lines.reduce((n, l) => n + l.quantity, 0),
        order_id: orderId,
      },
      // Purchase is the one event where we hold the full customer record — send
      // all of it. Every extra field raises Event Match Quality, and /api/capi
      // hashes them before they leave our server.
      userData: {
        email: email.trim() || undefined,
        phone: mobile.replace(/\D/g, "") || undefined,
        firstName: nameParts[0] || undefined,
        lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined,
        city: city.trim() || undefined,
        state: stateCode || undefined,
        zip: pincode.trim() || undefined,
        country: "IN",
      },
      // GA4 `purchase` — `order_id` above becomes its `transaction_id`.
      items: toGa4Items(lines),
    });
    clearCart();
    // Reset for next time (handler, not an effect — React Compiler safe).
    setStep(1);
    setProcessing(false);
    setError("");
    setAppliedCoupon("");
    setUpsell({ items: [], discount: 0 });
    // Re-arm the funnel-step guards so a subsequent order tracks fresh.
    checkoutTracked.current = false;
    paymentInfoTracked.current = false;
    if (WIX_ENABLED) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (wixClient as any).currentCart
        ?.deleteCurrentCart?.()
        .catch(() => {});
    }
    onClose();
    router.push(`/success?orderId=${encodeURIComponent(orderId)}`);
  };

  // PREPAID: Razorpay order → widget → verify signature → THEN create the order.
  const runPrepaidOrder = async () => {
    const orderResponse = await fetch("/api/razorpay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: totals.total,
        currency: "INR",
        receipt: `order_${Date.now()}`,
        notes: { email: email.trim(), phone: mobile.replace(/\D/g, "") },
      }),
    });
    const orderData = await orderResponse.json().catch(() => ({}));
    if (!orderResponse.ok || !orderData?.order_id) {
      throw new Error(orderData?.error || "Could not start the payment.");
    }

    const scriptOk = await loadRazorpayScript();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!scriptOk || !(window as any).Razorpay) {
      throw new Error("Could not load the payment gateway. Check your connection.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rzp = new (window as any).Razorpay({
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.order_id,
      name: BRAND_NAME,
      description: "Order payment",
      prefill: {
        name: fullName.trim(),
        email: email.trim(),
        contact: mobile.replace(/\D/g, ""),
      },
      notes: { address: address.trim() },
      theme: { color: "#071a47" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler: async (response: any) => {
        try {
          const verifyResponse = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyResponse.json().catch(() => ({}));
          if (!verifyResponse.ok || !verifyData?.verified) {
            throw new Error("Payment verification failed.");
          }
          const { orderId } = await finalizeOrder(
            "PREPAID",
            response.razorpay_payment_id,
          );
          completeOrder(orderId);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          setError(
            `Payment received but the order could not be completed: ${msg}. Please contact support with payment ID ${response.razorpay_payment_id}.`,
          );
          setProcessing(false);
        }
      },
      modal: { ondismiss: () => setProcessing(false) },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rzp.on("payment.failed", (resp: any) => {
      setError(`Payment failed: ${resp?.error?.description || "Please try again."}`);
      setProcessing(false);
    });

    rzp.open();
  };

  const handlePayment = async () => {
    const validationError = validateDelivery();
    if (validationError) return setError(validationError);
    if (!lines.length) return setError("Your bag is empty.");

    setError("");
    setProcessing(true);

    // AddPaymentInfo — the shopper has a complete, valid delivery address and has
    // committed to a payment method. A real step, unlike "reached step 3".
    if (!paymentInfoTracked.current) {
      paymentInfoTracked.current = true;
      trackEvent("AddPaymentInfo", {
        customData: {
          currency: "INR",
          value: totals.total,
          num_items: lines.reduce((n, l) => n + l.quantity, 0),
          content_ids: contentIds(lines),
          contents: toContents(lines),
          content_type: "product",
          payment_method: paymentMethod,
        },
        userData: {
          email: email.trim() || undefined,
          phone: mobile.replace(/\D/g, "") || undefined,
          firstName: fullName.trim().split(/\s+/)[0] || undefined,
          city: city.trim() || undefined,
          state: stateCode || undefined,
          zip: pincode.trim() || undefined,
          country: "IN",
        },
      });
    }

    try {
      if (paymentMethod === "PREPAID") {
        await runPrepaidOrder(); // stays "processing" until its callbacks fire
        return;
      }
      const { orderId } = await finalizeOrder("COD");
      completeOrder(orderId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to place order: ${msg}`);
      setProcessing(false);
    }
  };

  if (!open) return null;

  const inputClass =
    "w-full rounded-md border border-midnight-navy/30 bg-white px-4 py-2.5 text-sm text-midnight-navy placeholder:text-midnight-navy/50 focus:outline-none focus:border-midnight-navy focus:ring-1 focus:ring-midnight-navy";

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-stretch justify-end">
      {/* Overlay */}
      <div
        onClick={() => !processing && onClose()}
        className="absolute inset-0 bg-midnight-navy/60 backdrop-blur-[2px]"
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Checkout"
        className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-ivory shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-midnight-navy/15 px-6 py-5">
          <div>
            <h2 className="font-heading text-xl uppercase tracking-[0.25em] text-midnight-navy font-bold">
              Checkout
            </h2>
            <p className="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-midnight-navy/50">
              {/* With the upsell disabled, step 3 is really the 2nd of 2 steps. */}
              Step {UPSELL_ENABLED ? step : step === 3 ? 2 : step} of{" "}
              {UPSELL_ENABLED ? 3 : 2} ·{" "}
              {step === 1
                ? "Contact"
                : step === 2
                  ? "Your Ritual"
                  : "Delivery & Payment"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close checkout"
            onClick={() => !processing && onClose()}
            className="cursor-pointer rounded-full p-1 text-midnight-navy/70 transition-all hover:text-midnight-navy active:scale-95"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div data-lenis-prevent className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <label className="block">
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-midnight-navy/70">
                  Email address
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`mt-2 ${inputClass}`}
                  autoFocus
                />
              </label>
              <p className="text-xs leading-6 text-midnight-navy/60">
                Your order confirmation and updates are sent here.
              </p>
              <button
                type="button"
                onClick={goToStep2}
                className="w-full cursor-pointer rounded-full bg-midnight-navy px-6 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-champagne-gold transition-all hover:bg-midnight-navy/90 active:scale-95"
              >
                Continue
              </button>
            </div>
          ) : step === 2 ? (
            <SacredUpsellFlow
              primary={primaryProduct}
              catalog={catalog}
              cartIds={cartIds}
              onChange={setUpsell}
              onContinue={enterPaymentStep}
            />
          ) : (
            <div className="space-y-5">
              {/* Delivery details */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className={`sm:col-span-2 ${inputClass}`} />
                <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit mobile" inputMode="numeric" className={inputClass} />
                <input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="Pincode" inputMode="numeric" className={inputClass} />
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (house no, street, area)" className={`sm:col-span-2 ${inputClass}`} />
                <input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Landmark (optional)" className={`sm:col-span-2 ${inputClass}`} />
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className={inputClass} />
                <select value={stateCode} onChange={(e) => setStateCode(e.target.value)} className={inputClass}>
                  <option value="">Select state</option>
                  {IN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Payment method */}
              <div className="space-y-2">
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-midnight-navy/70">Payment method</span>
                {(["PREPAID", "COD"] as PaymentMethod[]).map((m) => {
                  const disabled = m === "PREPAID" && !PREPAID_ENABLED;
                  return (
                    <label
                      key={m}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                        disabled
                          ? "cursor-not-allowed border-midnight-navy/10 bg-midnight-navy/[0.03] opacity-60"
                          : paymentMethod === m
                            ? "cursor-pointer border-champagne-gold bg-champagne-gold/10"
                            : "cursor-pointer border-midnight-navy/20 hover:border-midnight-navy/40"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment"
                          disabled={disabled}
                          checked={paymentMethod === m}
                          onChange={() => !disabled && setPaymentMethod(m)}
                          className="accent-midnight-navy"
                        />
                        <span className="text-sm font-medium text-midnight-navy">
                          {m === "PREPAID" ? "Pay Online (UPI / Card)" : "Cash on Delivery"}
                        </span>
                      </span>
                      {m === "PREPAID" &&
                        (PREPAID_ENABLED ? (
                          <span className="text-xs font-bold text-green-600">Save ₹{PREPAID_DISCOUNT}</span>
                        ) : (
                          <span className="rounded-full bg-midnight-navy/10 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wider text-midnight-navy/60">
                            Coming soon
                          </span>
                        ))}
                    </label>
                  );
                })}
              </div>

              {/* Coupon */}
              <div className="rounded-lg border border-midnight-navy/15 bg-white/50 p-3">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-green-700">
                      ✦ {appliedCoupon} applied
                    </span>
                    <button type="button" onClick={handleRemoveCoupon} className="cursor-pointer text-xs text-midnight-navy/60 underline underline-offset-2 hover:text-midnight-navy">
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input value={couponInput} onChange={(e) => { setCouponInput(e.target.value); setCouponError(""); }} placeholder="Coupon code" className={`flex-1 ${inputClass} uppercase`} />
                      <button type="button" onClick={handleApplyCoupon} className="flex-shrink-0 cursor-pointer rounded-full bg-midnight-navy px-5 py-2 text-xs font-medium uppercase tracking-wider text-champagne-gold transition-all hover:bg-midnight-navy/90 active:scale-95">
                        Apply
                      </button>
                    </div>
                    {couponError && <p className="mt-2 text-xs text-red-600">{couponError}</p>}
                  </>
                )}
              </div>

              {/* Totals — the "tigdam" */}
              <div className="space-y-1.5 rounded-lg bg-sand/30 p-4 text-sm">
                <Row label="Subtotal" value={formatPrice(totals.subtotal)} />
                <Row
                  label="Shipping"
                  strike={formatPrice(totals.shippingFeeDisplay)}
                  value="FREE"
                  valueClass="text-green-600 font-bold"
                />
                <Row
                  label="Processing fee"
                  strike={formatPrice(totals.processingFeeDisplay)}
                  value="₹0"
                  valueClass="text-green-600 font-bold"
                />
                {totals.couponDiscount > 0 && (
                  <Row label={`Coupon (${appliedCoupon})`} value={`− ${formatPrice(totals.couponDiscount)}`} valueClass="text-champagne-gold font-semibold" />
                )}
                {totals.prepaidDiscount > 0 && (
                  <Row label="Online payment discount" value={`− ${formatPrice(totals.prepaidDiscount)}`} valueClass="text-champagne-gold font-semibold" />
                )}
                {totals.bundleDiscount > 0 && (
                  <Row label="✦ Sacred Bundle" value={`− ${formatPrice(totals.bundleDiscount)}`} valueClass="text-champagne-gold font-semibold" />
                )}
                {totals.giftWrapFee > 0 && (
                  <Row label="Gift wrap & note" value={`+ ${formatPrice(totals.giftWrapFee)}`} />
                )}
                <div className="mt-2 flex items-center justify-between border-t border-midnight-navy/15 pt-2">
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-midnight-navy/80">To pay</span>
                  <span className="text-xl font-bold text-midnight-navy">{formatPrice(totals.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer CTA (delivery step only) */}
        {step === 3 && (
          <div className="border-t border-midnight-navy/15 bg-ivory/95 px-6 py-4 backdrop-blur">
            <button
              type="button"
              onClick={handlePayment}
              // Also blocked while a coupon is being (re)validated, so the amount
              // shown and charged is never a stale pre-Wix number.
              disabled={processing || couponPending}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-champagne-gold px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-midnight-navy shadow-lg transition-all hover:bg-champagne-gold/85 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {processing
                ? "Processing…"
                : couponPending
                  ? "Checking coupon…"
                  : paymentMethod === "PREPAID"
                    ? `Pay ${formatPrice(totals.total)} securely ⚡`
                    : `Place order · ${formatPrice(totals.total)}`}
            </button>
            <p className="mt-2 text-center text-[0.6rem] uppercase tracking-wider text-midnight-navy/50">
              🔒 Secure checkout · {isPrepaid ? "Razorpay encrypted" : "Pay on delivery"}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Row({
  label,
  value,
  strike,
  valueClass = "text-midnight-navy",
}: {
  label: string;
  value: string;
  strike?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between text-midnight-navy/80">
      <span className="text-xs uppercase tracking-[0.12em]">{label}</span>
      <span className="flex items-center gap-2">
        {strike && <span className="text-xs text-midnight-navy/40 line-through">{strike}</span>}
        <span className={`text-sm ${valueClass}`}>{value}</span>
      </span>
    </div>
  );
}
