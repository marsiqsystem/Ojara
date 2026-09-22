"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useCartStore } from "@/lib/store/useCartStore";
import { useWixClient } from "@/hooks/useWixClient";
import { formatPrice } from "@/lib/format";
import {
  PREPAID_DISCOUNT,
  computeTotals,
  isTierCode,
} from "@/lib/commerce/pricing";
import { useLiveCoupon, type CouponLine } from "@/lib/commerce/useLiveCoupon";
import { useWixOffers } from "@/lib/commerce/useWixOffers";
import { estimateOffers } from "@/lib/commerce/offers";
import {
  BRAND_NAME,
  LOW_STOCK_THRESHOLD,
  PREPAID_ENABLED,
  WIX_ENABLED,
} from "@/lib/commerce/config";
import { useCouponAutoRemoveHandler } from "@/lib/commerce/useAutoTierCoupon";
import { useUpsellSuggestions } from "@/lib/commerce/useUpsellSuggestions";
import { IN_STATES, stateName as nameOfState } from "@/lib/commerce/indiaStates";
import { deliveryWindowLabel } from "@/lib/deliveryEstimate";
import { suggestEmail } from "@/lib/emailSuggest";
import { saveOrderSnapshot } from "@/lib/orderSnapshot";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import { trackEvent, trackingContext } from "@/lib/analytics/capi";
import { contentIds, toContents, toGa4Items } from "@/lib/analytics/content";
import OfferProgress from "@/components/OfferProgress";
import CheckoutOfferRails from "@/components/CheckoutOfferRails";

// ============================================================================
// Checkout — one page, rebuilt on the Viora pattern.
//
// It used to be two steps (email first, then everything else) with 14px inputs,
// no pincode lookup and a single "place order". Now: phone first (COD and the
// courier run on it), pincode fills city + state and shows the delivery date,
// email last with a typo check; details are remembered on this device; each
// payment method shows what it costs; COD asks for a small commitment; the
// running offers and the piece that unlocks the next one sit next to the real total; the pay
// bar is always in reach; and leaving gets one honest reminder of what's lost.
//
// The order path itself (Wix checkout → /api/checkout, Razorpay verify, Meta +
// GA4 events) is unchanged. The Sacred Bundle step (SacredUpsellFlow) was a
// separate checkout STEP and is not wired into the one-page layout; it was
// already switched off (UPSELL_ENABLED). Revive it as an inline section if the
// chakra bundle comes back.
// ============================================================================

type PaymentMethod = "PREPAID" | "COD";
type Field = "phone" | "pincode" | "fullName" | "address" | "city" | "state" | "email" | "codConfirm";

// Top-to-bottom order of the form, for scrolling to the first error.
const FIELD_ORDER: Field[] = ["phone", "pincode", "fullName", "address", "city", "state", "email", "codConfirm"];

// ---- Remembered details (this device only) ---------------------------------
const DETAILS_KEY = "ojara_checkout_details_v1";

type SavedDetails = {
  phone: string;
  pincode: string;
  fullName: string;
  address: string;
  landmark: string;
  city: string;
  state: string;
  email: string;
};

const readSavedDetails = (): Partial<SavedDetails> => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(DETAILS_KEY) || "{}");
  } catch {
    return {};
  }
};

// ---- Field helpers ----------------------------------------------------------

// Pasted numbers often carry +91, 0091 or a leading 0. Strip those prefixes only
// at the lengths they produce; anything else keeps its first 10 digits.
const normalizeIndianMobile = (raw: string) => {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 14 && digits.startsWith("0091")) digits = digits.slice(4);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
};

const isValidMobile = (phone: string) => /^[6-9]\d{9}$/.test(phone);
const isValidPincode = (pin: string) => /^[1-9]\d{5}$/.test(pin);
const isValidEmail = (email: string) => /^\S+@\S+\.\S+$/.test(email);

type FormValues = {
  phone: string;
  pincode: string;
  fullName: string;
  address: string;
  city: string;
  state: string;
  email: string;
  paymentMethod: PaymentMethod;
  codCommitted: boolean;
};

const validateFields = (v: FormValues): Partial<Record<Field, string>> => {
  const errors: Partial<Record<Field, string>> = {};
  if (!isValidMobile(v.phone)) errors.phone = "Enter a valid 10-digit mobile number.";
  if (!isValidPincode(v.pincode)) errors.pincode = "Enter a valid 6-digit pincode.";
  if (!v.fullName.trim()) errors.fullName = "Enter your full name.";
  if (v.address.trim().length < 5) errors.address = "Enter your house number and street.";
  if (!v.city.trim()) errors.city = "Enter your city.";
  if (!v.state) errors.state = "Select your state.";
  if (!isValidEmail(v.email.trim())) errors.email = "Enter a valid email for your order confirmation.";
  if (v.paymentMethod === "COD" && !v.codCommitted) {
    errors.codConfirm = "Please confirm you'll be available to pay on delivery.";
  }
  return errors;
};

// 16px text on inputs — anything smaller makes iOS Safari zoom the page on focus.
const inputClass = (hasError: boolean) =>
  `w-full rounded-lg border bg-white px-4 py-3 text-base text-midnight-navy placeholder:text-midnight-navy/40 outline-none focus:ring-2 ${
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "border-midnight-navy/25 focus:border-midnight-navy focus:ring-midnight-navy/15"
  }`;

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="mt-1 text-xs text-red-600">
      {message}
    </p>
  ) : null;

const LockIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

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

type PincodeLookup = { pin: string; status: "found" | "notFound" };

export default function CheckoutModal() {
  const router = useRouter();
  const wixClient = useWixClient();
  const cartItems = useCartStore((s) => s.cartItems);
  const clearCart = useCartStore((s) => s.clearCart);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const openCart = useCartStore((s) => s.openCart);
  const open = useCartStore((s) => s.isCheckoutOpen);
  const onClose = useCartStore((s) => s.closeCheckout);
  // The coupon comes from the cart store, so the shopper sees the same
  // numbers they saw in the bag.
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const setAppliedCoupon = useCartStore((s) => s.setAppliedCoupon);
  const shopperChoseCoupon = useCartStore((s) => s.shopperChoseCoupon);
  const setShopperChoseCoupon = useCartStore((s) => s.setShopperChoseCoupon);

  // Details — phone first, email last. A returning shopper on this device gets
  // back what they typed last time (lazy init: read once, no effect needed).
  const [saved] = useState(readSavedDetails);
  const [phone, setPhone] = useState(saved.phone || "");
  const [pincode, setPincode] = useState(saved.pincode || "");
  const [fullName, setFullName] = useState(saved.fullName || "");
  const [address, setAddress] = useState(saved.address || "");
  const [landmark, setLandmark] = useState(saved.landmark || "");
  const [city, setCity] = useState(saved.city || "");
  const [stateCode, setStateCode] = useState(saved.state || "");
  const [email, setEmail] = useState(saved.email || "");
  const [rememberDetails, setRememberDetails] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const fieldRefs = useRef<Partial<Record<Field, HTMLInputElement | HTMLSelectElement | null>>>({});

  // Pincode → city/state via /api/pincode. The status is keyed to the pin it was
  // looked up for, so a changed pin reads as "loading" without a sync setState.
  const [lookup, setLookup] = useState<PincodeLookup | null>(null);
  const autoFilledArea = useRef({ city: "", state: "" });

  // Pay online leads when it's live (fewer COD refusals); COD otherwise.
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PREPAID_ENABLED ? "PREPAID" : "COD");
  // COD commitment: a small, explicit promise to be home and pay — cuts refusals.
  const [codCommitted, setCodCommitted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  // "Don't miss out" prompt, at most once per time the checkout is opened.
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const exitPromptShown = useRef(false);

  // Fire-once guards for the funnel-step Meta events. Reset in completeOrder()
  // so a second order in the same session tracks again.
  const checkoutTracked = useRef(false);
  const paymentInfoTracked = useRef(false);

  // Normalised cart lines — what's priced, emailed and pushed to the Wix cart.
  const lines = useMemo(
    () =>
      cartItems.map(({ product, quantity }) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        stockCount: product.stockCount,
        quantity,
        image: product.image,
        wixCatalogItemId: product.wixCatalogItemId,
      })),
    [cartItems],
  );

  // Live coupon — validated against Wix's engine. `email` lets Wix enforce
  // single-use-per-buyer.
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
  } = useLiveCoupon(couponLines, email.trim() || undefined, useCouponAutoRemoveHandler(toast, true));
  // Bracelet + ring / buy 2 get 1 — Wix applies these to the order itself, so
  // the quoted total must carry Wix's own figure (a prepaid payment is checked
  // against it).
  const offers = useWixOffers(couponLines);

  const isPrepaid = paymentMethod === "PREPAID";
  const totalsFor = (prepaid: boolean) =>
    computeTotals({
      lines,
      isPrepaid: prepaid,
      wixReportedDiscount: couponDiscount,
      offerDiscount: offers.total,
    });
  const totals = totalsFor(isPrepaid);
  const prepaidTotal = totalsFor(true).total;
  const codTotal = totalsFor(false).total;

  // Only real savings: the Wix markdown, the offer, the pay-online discount.
  const mrpSavings = lines.reduce(
    (sum, l) => sum + Math.max(0, (l.originalPrice ?? l.price) - l.price) * l.quantity,
    0,
  );
  const totalSavings =
    mrpSavings + totals.offerDiscount + totals.couponDiscount + totals.prepaidDiscount;
  // What the same bag costs at full price — the anchor beside the real total.
  const mrpTotal = lines.reduce((sum, l) => sum + (l.originalPrice ?? l.price) * l.quantity, 0);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const lowStockLine = lines.find((l) => l.stockCount > 0 && l.stockCount <= LOW_STOCK_THRESHOLD);
  const firstName = fullName.trim().split(/\s+/)[0] || "";
  const emailSuggestion = suggestEmail(email);
  const pincodeStatus: "idle" | "loading" | "found" | "notFound" = !isValidPincode(pincode)
    ? "idle"
    : lookup?.pin === pincode
      ? lookup.status
      : "loading";
  const detailsComplete =
    Object.keys(
      validateFields({ phone, pincode, fullName, address, city, state: stateCode, email, paymentMethod, codCommitted }),
    ).length === 0;

  // Change the order without leaving checkout. A removal says what it costs
  // (a free bracelet, the ring's 10%) and can be undone; removing the last
  // piece goes back to the (empty) bag.
  const [undoLine, setUndoLine] = useState<{ item: (typeof cartItems)[number]; lost: string[] } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);
  const offerLinesOf = (items: typeof cartItems) =>
    items.map((ci) => ({ name: ci.product.name, price: ci.product.price, quantity: ci.quantity }));
  const removeLine = (productId: string) => {
    const item = cartItems.find((ci) => ci.product.id === productId);
    if (!item) return;
    const rest = cartItems.filter((ci) => ci.product.id !== productId);
    const before = estimateOffers(offerLinesOf(cartItems));
    const after = estimateOffers(offerLinesOf(rest));
    const lost = [
      after.freeCount < before.freeCount ? "your free bracelet" : "",
      after.comboCount < before.comboCount ? "10% off your ring" : "",
    ].filter(Boolean);
    removeItem(productId);
    if (rest.length === 0) {
      onClose();
      openCart();
      return;
    }
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoLine({ item, lost });
    undoTimer.current = setTimeout(() => setUndoLine(null), 8000);
  };
  const undoRemove = () => {
    if (!undoLine) return;
    const { item } = undoLine;
    addItem(item.product);
    if (item.quantity > 1) updateQuantity(item.product.id, item.quantity);
    setUndoLine(null);
  };
  const changeLineQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) removeLine(productId);
    else updateQuantity(productId, quantity);
  };

  // Pieces that complete an offer (more bracelets → one free, a ring → 10% off it).
  const { rails: offerRails } = useUpsellSuggestions({ bag: cartItems, limit: 6 });

  // Lock scroll (Lenis-aware) while open.
  useEffect(() => {
    if (!open) return;
    lockScroll();
    return () => unlockScroll();
  }, [open]);

  // Remember details on this device as they're typed. Unticking forgets them.
  useEffect(() => {
    if (!open) return;
    try {
      const details: SavedDetails = { phone, pincode, fullName, address, landmark, city, state: stateCode, email };
      if (!rememberDetails) window.localStorage.removeItem(DETAILS_KEY);
      else if (Object.values(details).some(Boolean)) {
        window.localStorage.setItem(DETAILS_KEY, JSON.stringify(details));
      }
    } catch {
      // Storage blocked (private mode) — the form still works, it just won't remember.
    }
  }, [open, rememberDetails, phone, pincode, fullName, address, landmark, city, stateCode, email]);

  // Pincode → city + state (India Post) and the delivery date.
  useEffect(() => {
    if (!open || !isValidPincode(pincode) || lookup?.pin === pincode) return;
    let cancelled = false;
    fetch(`/api/pincode?pin=${pincode}`)
      .then((res) => res.json())
      .then((info) => {
        if (cancelled) return;
        if (!info?.ok) {
          setLookup({ pin: pincode, status: "notFound" });
          return;
        }
        setLookup({ pin: pincode, status: "found" });
        // Fill city/state unless the shopper typed their own.
        const previous = autoFilledArea.current;
        setCity((prev) => (!prev || prev === previous.city ? info.city : prev));
        if (info.state) setStateCode((prev) => (!prev || prev === previous.state ? info.state : prev));
        autoFilledArea.current = { city: info.city, state: info.state || "" };
        setErrors((e) => ({ ...e, pincode: undefined, city: undefined, state: undefined }));
      })
      .catch(() => {
        if (!cancelled) setLookup({ pin: pincode, status: "notFound" });
      });
    return () => {
      cancelled = true;
    };
  }, [open, pincode, lookup?.pin]);

  // InitiateCheckout — fired once, here, the moment the checkout actually opens.
  // Every entry point routes through openCheckout(), so this is the single place
  // that sees all of them, with the real cart totals.
  useEffect(() => {
    if (!open) {
      checkoutTracked.current = false;
      exitPromptShown.current = false;
      return;
    }
    if (checkoutTracked.current || !lines.length) return;
    checkoutTracked.current = true;

    trackEvent("InitiateCheckout", {
      customData: {
        currency: "INR",
        value: totals.total,
        num_items: itemCount,
        content_ids: contentIds(lines),
        contents: toContents(lines),
        content_type: "product",
      },
      items: toGa4Items(lines),
    });
    // `lines`/`totals` are read, not tracked: the guard makes this fire at most
    // once per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lines]);

  // Leaving with savings or details in progress gets one honest reminder.
  const hasProgress = !!(phone || pincode || fullName || address) || totalSavings > 0;
  const requestClose = () => {
    if (processing) return;
    if (!exitPromptShown.current && lines.length > 0 && hasProgress) {
      exitPromptShown.current = true;
      setShowExitPrompt(true);
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") document.getElementById("checkout-close")?.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const exitLosses = [
    totalSavings > 0 ? `${formatPrice(Math.round(totalSavings))} of savings on this order` : "",
    totals.couponDiscount > 0 && appliedCoupon
      ? `${appliedCoupon}: ${formatPrice(totals.couponDiscount)} off`
      : "",
    lowStockLine ? `Only ${lowStockLine.stockCount} left of ${lowStockLine.name}` : "",
    pincodeStatus === "found" ? `Delivery ${deliveryWindowLabel()}` : "",
  ]
    .filter(Boolean)
    .slice(0, 4);

  // Typing into a field clears its error.
  const updateField = (field: Field, setter: (value: string) => void, value: string) => {
    setter(value);
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const focusFirstError = (fieldErrors: Partial<Record<Field, string>>) => {
    const first = FIELD_ORDER.find((f) => fieldErrors[f]);
    const el = first ? fieldRefs.current[first] : null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
  };

  const handleApplyCoupon = async () => {
    // A typed code is the shopper's choice — the bag stops auto-applying WELCOME10.
    setShopperChoseCoupon(true);
    const { ok, error: cErr } = await applyCouponLive(couponInput);
    if (ok) {
      setCouponError("");
      setCouponInput("");
      setShowCouponInput(false);
      toast.success("✦ Coupon applied.");
    } else {
      setCouponError(cErr || "That code isn’t valid.");
    }
  };

  const handleRemoveCoupon = () => {
    setShopperChoseCoupon(true);
    removeCouponLive();
    setCouponError("");
  };

  // Build the item + summary payload the email renderer needs (mock mode) and the
  // Wix email step mirrors (live mode).
  const buildOrderPayload = () => ({
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
      discount: String(totals.offerDiscount + totals.couponDiscount + totals.prepaidDiscount),
      total: String(totals.total),
    },
    amount: totals.total.toFixed(2),
    couponCode: appliedCoupon || undefined,
    stateName: nameOfState(stateCode),
  });

  // Turn the cart into an order via /api/checkout. Live mode first materialises
  // a Wix checkout from the current cart.
  const finalizeOrder = async (
    method: PaymentMethod,
    razorpayPaymentId?: string,
  ): Promise<{ orderId: string; orderNumber?: string }> => {
    const payload = buildOrderPayload();

    let checkoutId: string | undefined;
    if (WIX_ENABLED) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wc = wixClient as any;
      const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";
      const lineItems = lines
        .filter((l) => l.wixCatalogItemId)
        .map((l) => ({
          catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: l.wixCatalogItemId },
          quantity: l.quantity,
        }));
      if (lineItems.length) {
        await wc.currentCart.deleteCurrentCart().catch(() => {});
        await wc.currentCart.addToCurrentCart({ lineItems });
      }
      // Apply the coupon natively so Wix's engine computes the discount and it
      // shows on the resulting order. Best-effort: if Wix rejects it, the order
      // still proceeds.
      if (appliedCoupon) {
        try {
          await wc.currentCart.updateCurrentCart({ couponCode: appliedCoupon });
        } catch (couponErr) {
          console.error("Wix rejected coupon", appliedCoupon, couponErr);
        }
      }
      const checkoutResult = await wc.currentCart.createCheckoutFromCurrentCart({ channelType: "WEB" });
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
          phone,
          addressLine1: address.trim(),
          addressLine2: landmark.trim(),
          city: city.trim(),
          state: stateCode,
          postalCode: pincode.trim(),
          paymentMethod: method,
          razorpayPaymentId,
        },
        items: payload.items,
        summary: payload.summary,
        amount: payload.amount,
        couponCode: payload.couponCode,
        // Lets the server fire its own Meta Purchase the moment the order exists.
        // It reuses event_id `purchase-<orderId>`, the same id the browser
        // Purchase uses, so Meta counts ONE conversion.
        tracking: {
          ...trackingContext(),
          contentIds: contentIds(lines),
          contents: toContents(lines),
          numItems: itemCount,
          value: totals.total,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Order creation failed.");
    if (!data.orderId) throw new Error("No order ID was returned.");
    return { orderId: data.orderId, orderNumber: data.orderNumber };
  };

  const completeOrder = (orderId: string, orderNumber?: string) => {
    // Fire Purchase BEFORE clearCart wipes the totals. eventId matches the server
    // CAPI event so Meta de-duplicates.
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    trackEvent("Purchase", {
      eventId: `purchase-${orderId}`,
      customData: {
        currency: "INR",
        value: totals.total,
        content_ids: contentIds(lines),
        contents: toContents(lines),
        content_type: "product",
        num_items: itemCount,
        order_id: orderId,
      },
      // Purchase is the one event where we hold the full customer record — every
      // field raises Event Match Quality; /api/capi hashes them server-side.
      userData: {
        email: email.trim() || undefined,
        phone: phone || undefined,
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
    // What the success page shows — saved before clearCart wipes the lines.
    saveOrderSnapshot({
      orderId,
      orderNumber,
      placedAt: Date.now(),
      firstName: nameParts[0] || "",
      email: email.trim(),
      phoneLast4: phone.slice(-4),
      city: city.trim(),
      paymentMethod,
      items: lines.map((l) => ({ name: l.name, quantity: l.quantity, price: l.price, image: l.image })),
      subtotal: totals.subtotal,
      discount: totals.offerDiscount + totals.couponDiscount + totals.prepaidDiscount,
      total: totals.total,
    });
    clearCart();
    // Reset for next time (handler, not an effect — React Compiler safe).
    setProcessing(false);
    setError("");
    setAppliedCoupon("");
    setCodCommitted(false);
    checkoutTracked.current = false;
    paymentInfoTracked.current = false;
    if (WIX_ENABLED) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (wixClient as any).currentCart?.deleteCurrentCart?.().catch(() => {});
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
        notes: { email: email.trim(), phone },
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
      prefill: { name: fullName.trim(), email: email.trim(), contact: phone },
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
          const { orderId, orderNumber } = await finalizeOrder("PREPAID", response.razorpay_payment_id);
          completeOrder(orderId, orderNumber);
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
    if (!lines.length) return setError("Your bag is empty.");
    const fieldErrors = validateFields({
      phone,
      pincode,
      fullName,
      address,
      city,
      state: stateCode,
      email,
      paymentMethod,
      codCommitted,
    });
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      focusFirstError(fieldErrors);
      return;
    }

    setError("");
    setProcessing(true);

    // AddPaymentInfo — a complete, valid address and a chosen payment method.
    if (!paymentInfoTracked.current) {
      paymentInfoTracked.current = true;
      trackEvent("AddPaymentInfo", {
        customData: {
          currency: "INR",
          value: totals.total,
          num_items: itemCount,
          content_ids: contentIds(lines),
          contents: toContents(lines),
          content_type: "product",
          payment_method: paymentMethod,
        },
        userData: {
          email: email.trim() || undefined,
          phone: phone || undefined,
          firstName: firstName || undefined,
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
      const { orderId, orderNumber } = await finalizeOrder("COD");
      completeOrder(orderId, orderNumber);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to place order: ${msg}`);
      setProcessing(false);
    }
  };

  if (!open) return null;

  const paymentOptions: { id: PaymentMethod; label: string; badge: string; sub: string; amount: number; disabled: boolean }[] = [
    {
      id: "PREPAID",
      label: "Pay online",
      badge: PREPAID_ENABLED ? `Save ${formatPrice(PREPAID_DISCOUNT)}` : "Coming soon",
      sub: "UPI, cards & wallets · secured by Razorpay",
      amount: prepaidTotal,
      disabled: !PREPAID_ENABLED,
    },
    {
      id: "COD",
      label: "Cash on Delivery",
      badge: "Pay when it arrives",
      sub: "Pay the courier in cash or UPI",
      amount: codTotal,
      disabled: false,
    },
  ];

  const labelClass = "text-xs font-medium text-midnight-navy/75";

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-stretch justify-end">
      {/* Overlay */}
      <div onClick={requestClose} className="absolute inset-0 bg-midnight-navy/60 backdrop-blur-[2px]" aria-hidden="true" />

      {/* Panel */}
      <div role="dialog" aria-modal="true" aria-label="Checkout" className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-ivory shadow-2xl">
        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Header — secure, the running total, and how far along they are */}
          <div className="sticky top-0 z-20 border-b border-midnight-navy/10 bg-ivory">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                id="checkout-close"
                type="button"
                onClick={requestClose}
                aria-label="Close checkout"
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-midnight-navy/60 hover:bg-sand/60"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-midnight-navy">
                <LockIcon className="h-4 w-4 text-emerald-700" />
                Secure checkout
              </p>
              <span className="min-w-[2.25rem] text-right text-sm font-bold tabular-nums text-midnight-navy">
                {formatPrice(totals.total)}
              </span>
            </div>
            {/* The bag is done, so the shopper is already two-thirds in. */}
            <ol className="flex items-center justify-center gap-2 pb-2 text-[0.68rem] font-semibold uppercase tracking-wider" aria-label="Checkout progress">
              <li className="text-emerald-700">✓ Bag</li>
              <li className="text-midnight-navy/25" aria-hidden="true">—</li>
              <li className={detailsComplete ? "text-emerald-700" : "text-champagne-gold"}>
                {detailsComplete ? "✓ Details" : "2 Details"}
              </li>
              <li className="text-midnight-navy/25" aria-hidden="true">—</li>
              <li className={detailsComplete ? "text-champagne-gold" : "text-midnight-navy/40"}>3 Pay</li>
            </ol>
          </div>

          <p className="px-5 pt-4 text-center font-heading text-xl text-midnight-navy">
            {firstName ? `Almost yours, ${firstName} ✨` : "You're one step away from your order"}
          </p>

          {/* Your order — collapsed to thumbnails; open for the list */}
          <details className="group mt-3 border-y border-midnight-navy/10">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden">
              <span className="flex -space-x-2">
                {lines.slice(0, 3).map((l) => (
                  <span key={l.id} className="relative h-9 w-9 overflow-hidden rounded-md border-2 border-ivory bg-sand">
                    <Image src={l.image} alt="" fill sizes="36px" className="object-cover" />
                  </span>
                ))}
              </span>
              <span className="flex-1 text-sm text-midnight-navy">
                Your order · {itemCount} {itemCount === 1 ? "piece" : "pieces"}
              </span>
              <span className="text-xs font-semibold text-champagne-gold group-open:hidden">View &amp; edit</span>
              <span className="hidden text-xs font-semibold text-champagne-gold group-open:inline">Hide</span>
            </summary>
            {undoLine && (
              <div role="status" className="mx-5 mb-3 flex items-center justify-between gap-3 rounded-lg bg-midnight-navy px-3 py-2 text-xs text-ivory">
                <span className="min-w-0">
                  <span className="block truncate">Removed {undoLine.item.product.name}</span>
                  {undoLine.lost.length > 0 && (
                    <span className="block text-champagne-gold">You no longer get {undoLine.lost.join(" or ")}</span>
                  )}
                </span>
                <button type="button" onClick={undoRemove} className="shrink-0 cursor-pointer font-bold uppercase tracking-wider text-champagne-gold">
                  Undo
                </button>
              </div>
            )}
            <ul className="space-y-3 px-5 pb-4">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center gap-3">
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-sand">
                    <Image src={l.image} alt="" fill sizes="48px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 block text-sm text-midnight-navy">{l.name}</span>
                    {l.stockCount > 0 && l.stockCount <= LOW_STOCK_THRESHOLD && (
                      <span className="text-xs font-semibold text-orange-600">Only {l.stockCount} left</span>
                    )}
                    <span className="mt-1 flex items-center gap-3">
                      <span className="flex h-7 items-center rounded-lg border border-midnight-navy/20 bg-white">
                        <button
                          type="button"
                          onClick={() => changeLineQuantity(l.id, l.quantity - 1)}
                          aria-label={`Decrease quantity of ${l.name}`}
                          className="h-full w-7 cursor-pointer text-midnight-navy"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-semibold tabular-nums text-midnight-navy">{l.quantity}</span>
                        <button
                          type="button"
                          onClick={() => changeLineQuantity(l.id, l.quantity + 1)}
                          disabled={l.stockCount > 0 && l.quantity >= l.stockCount}
                          aria-label={`Increase quantity of ${l.name}`}
                          className="h-full w-7 cursor-pointer text-midnight-navy disabled:opacity-40"
                        >
                          +
                        </button>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(l.id)}
                        className="cursor-pointer text-xs font-medium text-midnight-navy/55 underline underline-offset-2 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </span>
                  </span>
                  <span className="self-start text-sm font-medium tabular-nums text-midnight-navy">{formatPrice(l.price * l.quantity)}</span>
                </li>
              ))}
            </ul>
          </details>

          {totalSavings > 0 && (
            <p className="bg-emerald-50 px-5 py-2 text-center text-sm font-semibold text-emerald-800">
              🎉 You&apos;re saving {formatPrice(Math.round(totalSavings))} on this order
              {appliedCoupon && isTierCode(appliedCoupon) && !shopperChoseCoupon && totals.couponDiscount > 0 && (
                <span className="block text-xs font-medium text-emerald-700">First-order {appliedCoupon} applied automatically</span>
              )}
            </p>
          )}

          <div className="space-y-7 p-5">
            {/* Offers — what's applied, and the piece that earns the next one.
                First, so it's seen before the form, not after it. */}
            <section className="space-y-4">
              <OfferProgress
                lines={lines}
                offers={offers.discounts}
                welcomeDiscount={appliedCoupon && isTierCode(appliedCoupon) ? totals.couponDiscount : 0}
                hide={offerRails.map((r) => r.nudge.offer)}
              />
              <CheckoutOfferRails rails={offerRails} />
            </section>

            {/* Delivery details — phone first, email last */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-midnight-navy">Delivery details</h3>

              <div>
                <label htmlFor="co-phone" className={labelClass}>Mobile number</label>
                <div className="mt-1 flex">
                  <span className="flex items-center rounded-l-lg border border-r-0 border-midnight-navy/25 bg-sand/50 px-3 text-base text-midnight-navy/70">+91</span>
                  <input
                    id="co-phone"
                    ref={(el) => {
                      fieldRefs.current.phone = el;
                    }}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={phone}
                    onChange={(e) => updateField("phone", setPhone, normalizeIndianMobile(e.target.value))}
                    placeholder="10-digit mobile number"
                    aria-invalid={!!errors.phone}
                    className={`${inputClass(!!errors.phone)} rounded-l-none`}
                  />
                </div>
                <FieldError message={errors.phone} />
                <p className="mt-1 text-[0.7rem] text-midnight-navy/50">For delivery updates from the courier.</p>
              </div>

              <div>
                <label htmlFor="co-pincode" className={labelClass}>Pincode</label>
                <input
                  id="co-pincode"
                  ref={(el) => {
                    fieldRefs.current.pincode = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={pincode}
                  onChange={(e) => updateField("pincode", setPincode, e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit pincode"
                  aria-invalid={!!errors.pincode}
                  className={`mt-1 ${inputClass(!!errors.pincode)}`}
                />
                <FieldError message={errors.pincode} />
                {pincodeStatus === "loading" && <p className="mt-1 text-xs text-midnight-navy/55">Finding your area…</p>}
                {pincodeStatus === "found" && (
                  <p className="mt-1 text-xs font-medium text-emerald-700">🚚 Delivery {deliveryWindowLabel()}</p>
                )}
                {pincodeStatus === "notFound" && (
                  <p className="mt-1 text-xs text-amber-700">
                    We couldn&apos;t look up this pincode — please check it and enter your city below.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="co-name" className={labelClass}>Full name</label>
                <input
                  id="co-name"
                  ref={(el) => {
                    fieldRefs.current.fullName = el;
                  }}
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  value={fullName}
                  onChange={(e) => updateField("fullName", setFullName, e.target.value)}
                  aria-invalid={!!errors.fullName}
                  className={`mt-1 ${inputClass(!!errors.fullName)}`}
                />
                <FieldError message={errors.fullName} />
              </div>

              <div>
                <label htmlFor="co-address" className={labelClass}>House no., building, street</label>
                <input
                  id="co-address"
                  ref={(el) => {
                    fieldRefs.current.address = el;
                  }}
                  type="text"
                  autoComplete="address-line1"
                  maxLength={120}
                  value={address}
                  onChange={(e) => updateField("address", setAddress, e.target.value)}
                  aria-invalid={!!errors.address}
                  className={`mt-1 ${inputClass(!!errors.address)}`}
                />
                <FieldError message={errors.address} />
                <input
                  type="text"
                  autoComplete="address-line2"
                  maxLength={120}
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Area / landmark (optional)"
                  aria-label="Area or landmark (optional)"
                  className={`mt-2 ${inputClass(false)}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="co-city" className={labelClass}>City</label>
                  <input
                    id="co-city"
                    ref={(el) => {
                      fieldRefs.current.city = el;
                    }}
                    type="text"
                    autoComplete="address-level2"
                    maxLength={50}
                    value={city}
                    onChange={(e) => updateField("city", setCity, e.target.value)}
                    aria-invalid={!!errors.city}
                    className={`mt-1 ${inputClass(!!errors.city)}`}
                  />
                  <FieldError message={errors.city} />
                </div>
                <div>
                  <label htmlFor="co-state" className={labelClass}>State</label>
                  <select
                    id="co-state"
                    ref={(el) => {
                      fieldRefs.current.state = el;
                    }}
                    autoComplete="address-level1"
                    value={stateCode}
                    onChange={(e) => updateField("state", setStateCode, e.target.value)}
                    aria-invalid={!!errors.state}
                    className={`mt-1 ${inputClass(!!errors.state)}`}
                  >
                    <option value="">Select</option>
                    {IN_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.state} />
                </div>
              </div>

              <div>
                <label htmlFor="co-email" className={labelClass}>
                  Email <span className="font-normal text-midnight-navy/50">(for your order confirmation)</span>
                </label>
                <input
                  id="co-email"
                  ref={(el) => {
                    fieldRefs.current.email = el;
                  }}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => updateField("email", setEmail, e.target.value)}
                  aria-invalid={!!errors.email}
                  className={`mt-1 ${inputClass(!!errors.email)}`}
                />
                <FieldError message={errors.email} />
                {emailSuggestion && (
                  <p className="mt-1 text-xs text-midnight-navy/65">
                    Did you mean{" "}
                    <button
                      type="button"
                      onClick={() => updateField("email", setEmail, emailSuggestion)}
                      className="cursor-pointer font-semibold text-champagne-gold underline underline-offset-2"
                    >
                      {emailSuggestion}
                    </button>
                    ?
                  </p>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs text-midnight-navy/65">
                <input
                  type="checkbox"
                  checked={rememberDetails}
                  onChange={(e) => setRememberDetails(e.target.checked)}
                  className="h-4 w-4 accent-midnight-navy"
                />
                Save these details on this device for next time
              </label>
            </section>

            {/* Payment — what each method costs, side by side */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-midnight-navy">Payment</h3>
              {paymentOptions.map((opt) => {
                const selected = paymentMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => !opt.disabled && setPaymentMethod(opt.id)}
                    disabled={opt.disabled}
                    aria-pressed={selected}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                      opt.disabled
                        ? "cursor-not-allowed border-midnight-navy/10 bg-midnight-navy/[0.03] opacity-60"
                        : selected
                          ? "cursor-pointer border-champagne-gold bg-champagne-gold/10 ring-2 ring-champagne-gold/30"
                          : "cursor-pointer border-midnight-navy/20 hover:border-midnight-navy/40"
                    }`}
                  >
                    <span className={`h-4 w-4 flex-shrink-0 rounded-full border-2 ${selected ? "border-midnight-navy bg-midnight-navy" : "border-midnight-navy/30"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-midnight-navy">{opt.label}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider ${
                            opt.id === "PREPAID" && !opt.disabled
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-midnight-navy/10 text-midnight-navy/65"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-midnight-navy/55">{opt.sub}</span>
                    </span>
                    {!opt.disabled && (
                      <span className="text-base font-bold tabular-nums text-midnight-navy">{formatPrice(opt.amount)}</span>
                    )}
                  </button>
                );
              })}

              {!isPrepaid && (
                <>
                  {PREPAID_ENABLED && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("PREPAID")}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-left hover:bg-amber-100"
                    >
                      <span className="text-lg leading-none" aria-hidden="true">💡</span>
                      <span className="text-xs font-medium leading-snug text-amber-800">
                        Pay online for {formatPrice(prepaidTotal)} and save {formatPrice(codTotal - prepaidTotal)}.{" "}
                        <span className="underline">Switch</span>
                      </span>
                    </button>
                  )}
                  <label
                    className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs ${
                      errors.codConfirm ? "border-red-300 bg-red-50" : "border-midnight-navy/20"
                    }`}
                  >
                    <input
                      ref={(el) => {
                        fieldRefs.current.codConfirm = el;
                      }}
                      type="checkbox"
                      checked={codCommitted}
                      onChange={(e) => {
                        setCodCommitted(e.target.checked);
                        if (errors.codConfirm) setErrors((prev) => ({ ...prev, codConfirm: undefined }));
                      }}
                      className="mt-0.5 h-4 w-4 accent-midnight-navy"
                    />
                    <span className="text-midnight-navy">
                      I&apos;ll be available to receive this order and pay <b>{formatPrice(codTotal)}</b> on delivery.
                    </span>
                  </label>
                  <FieldError message={errors.codConfirm} />
                </>
              )}
            </section>

            {/* Other codes */}
            <section className="space-y-3">
              {appliedCoupon && totals.couponDiscount > 0 ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                  <p className="min-w-0 truncate text-xs font-semibold text-emerald-800">
                    ✓ {appliedCoupon} applied
                    <span className="font-normal text-emerald-700"> · you save {formatPrice(totals.couponDiscount)}</span>
                  </p>
                  <button type="button" onClick={handleRemoveCoupon} className="cursor-pointer text-[0.7rem] font-semibold uppercase tracking-wider text-red-600">
                    Remove
                  </button>
                </div>
              ) : !showCouponInput ? (
                <button
                  type="button"
                  onClick={() => setShowCouponInput(true)}
                  className="cursor-pointer text-xs font-medium text-midnight-navy/60 underline underline-offset-2 hover:text-midnight-navy"
                >
                  Have a different coupon code?
                </button>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        setCouponError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      placeholder="ENTER CODE"
                      aria-label="Coupon code"
                      autoFocus
                      className={`${inputClass(false)} min-w-0 flex-1 py-2 uppercase tracking-wider`}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim() || processing}
                      className="cursor-pointer rounded-full bg-midnight-navy px-4 text-[0.7rem] font-semibold uppercase tracking-wider text-champagne-gold disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="mt-1.5 text-xs text-red-600">{couponError}</p>}
                </div>
              )}
            </section>

            {/* Price breakdown */}
            <section className="space-y-1.5 rounded-xl bg-sand/40 p-4 text-sm">
              <div className="flex justify-between text-midnight-navy/75">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPrice(totals.subtotal)}</span>
              </div>
              {offers.discounts.map((o) => (
                <div key={o.name} className="flex justify-between gap-2 font-medium text-emerald-700">
                  <span className="min-w-0">{o.name}</span>
                  <span className="shrink-0 tabular-nums">− {formatPrice(o.amount)}</span>
                </div>
              ))}
              {totals.couponDiscount > 0 && (
                <div className="flex justify-between font-medium text-emerald-700">
                  <span>{isTierCode(appliedCoupon) ? "First-order discount" : "Coupon"} ({appliedCoupon})</span>
                  <span className="tabular-nums">− {formatPrice(totals.couponDiscount)}</span>
                </div>
              )}
              {totals.prepaidDiscount > 0 && (
                <div className="flex justify-between font-medium text-emerald-700">
                  <span>Pay-online discount</span>
                  <span className="tabular-nums">− {formatPrice(totals.prepaidDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-midnight-navy/75">
                <span>Delivery</span>
                <span className="font-semibold text-emerald-700">FREE</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-midnight-navy/15 pt-3 text-base font-bold text-midnight-navy">
                <span>{isPrepaid ? "Total" : "Total (pay on delivery)"}</span>
                <span className="tabular-nums">{formatPrice(totals.total)}</span>
              </div>
            </section>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </div>
        </div>

        {/* Sticky pay bar — the total and the one button, always in reach */}
        <div className="border-t border-midnight-navy/10 bg-ivory px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-6px_16px_rgba(0,0,0,0.06)]">
          {lowStockLine && (
            <p className="mb-2 text-center text-[0.7rem] font-semibold text-orange-700">
              ⚠ Only {lowStockLine.stockCount} left of {lowStockLine.name} — order now to get yours
            </p>
          )}
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              {mrpTotal > totals.total + 1 && (
                <p className="text-[0.7rem] tabular-nums text-midnight-navy/40 line-through">{formatPrice(mrpTotal)}</p>
              )}
              <p className="text-lg font-bold leading-tight tabular-nums text-midnight-navy">{formatPrice(totals.total)}</p>
              <p className="text-[0.7rem] font-medium text-emerald-700">
                {totalSavings > 0 ? `Saving ${formatPrice(Math.round(totalSavings))}` : isPrepaid ? "Paying online" : "Pay on delivery"}
              </p>
            </div>
            <button
              type="button"
              onClick={handlePayment}
              // Blocked while a coupon or the automatic offers are being
              // (re)priced, so the amount shown
              // and charged is never a stale number.
              disabled={processing || couponPending || offers.pending}
              className="flex-1 cursor-pointer rounded-full bg-champagne-gold py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-midnight-navy shadow-lg transition-all hover:bg-champagne-gold/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing
                ? "Processing…"
                : couponPending || offers.pending
                  ? "Updating total…"
                  : isPrepaid
                    ? `Pay ${formatPrice(totals.total)} securely`
                    : "Place COD order"}
            </button>
          </div>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[0.68rem] text-midnight-navy/55">
            <LockIcon className="h-3.5 w-3.5" />
            {isPrepaid ? "Secured by Razorpay" : "Pay on delivery"} · 48-hr exchange ·{" "}
            {pincodeStatus === "found" ? `Arrives ${deliveryWindowLabel()}` : "Free delivery across India"}
          </p>
        </div>
      </div>

      {/* "Don't miss out" — one honest reminder of what's being left behind */}
      {showExitPrompt && (
        <div
          className="fixed inset-0 z-[10001] flex items-end justify-center bg-midnight-navy/40 md:items-center"
          onClick={() => setShowExitPrompt(false)}
        >
          <div
            role="alertdialog"
            aria-label="Leave checkout?"
            className="w-full rounded-t-2xl bg-ivory p-5 shadow-2xl md:max-w-sm md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-heading text-2xl text-midnight-navy">Wait — don&apos;t miss out</p>
            <p className="mt-1 text-sm text-midnight-navy/65">
              {exitLosses.length > 0
                ? "Your bag is saved, but if you leave now you miss:"
                : "Your bag and details are saved for when you come back."}
            </p>
            {exitLosses.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm text-midnight-navy">
                {exitLosses.map((loss) => (
                  <li key={loss} className="flex items-start gap-2">
                    <span className="mt-0.5 text-champagne-gold" aria-hidden="true">●</span>
                    {loss}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setShowExitPrompt(false)}
              className="mt-5 w-full cursor-pointer rounded-full bg-midnight-navy py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-champagne-gold"
            >
              Complete my order
            </button>
            <button
              type="button"
              onClick={() => {
                setShowExitPrompt(false);
                onClose();
              }}
              className="mt-2 w-full cursor-pointer py-2 text-sm text-midnight-navy/55 underline underline-offset-2"
            >
              Leave checkout
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
