import { NextResponse, after } from "next/server";
import { UPSELL_ENABLED, WIX_ADMIN_ENABLED } from "@/lib/commerce/config";
import { PREPAID_DISCOUNT } from "@/lib/commerce/pricing";
import { normalizeSubdivision } from "@/lib/commerce/indiaStates";
import { clientIp, isRateLimited, isSameOrigin } from "@/lib/apiGuard";
import {
  capturePayment,
  markPaymentUsed,
  paymentCoversTotal,
  verifyPrepaidPayment,
  type VerifiedPayment,
} from "@/lib/razorpayServer";
import {
  sendOrderConfirmationEmail,
  type OrderEmailParams,
} from "@/lib/orderEmail";
import { CAPI_ENABLED, requestContext, sendMetaEvent } from "@/lib/analytics/meta";

// ============================================================================
// Checkout orchestrator (bundle §8) — the heart of the order flow.
//
// TWO modes, chosen by whether the Wix admin key is present:
//
//  • LIVE  (WIX_ADMIN_ENABLED): the full Viora path — stamp buyer/shipping onto
//    the Wix checkout, auto-select a carrier, create + approve the order,
//    reconcile the prepaid discount via a draft-order edit, mark the payment
//    paid, and send the confirmation email inline (there is NO Wix webhook).
//
//  • MOCK  (no keys yet): synthesise an order id from the client-supplied cart
//    items + totals and STILL send the real confirmation email, so the whole
//    flow — including the branded email — is verifiable before Wix exists.
//
// ⚠️ Wix's automatic order-confirmation email MUST be turned OFF in the dashboard
//    once live, or customers get two (bundle §0.2).
// ============================================================================

type CheckoutAddressPayload = {
  email: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  paymentMethod: "COD" | "PREPAID";
  razorpayPaymentId?: string;
};

// Ceiling on the client-supplied Sacred Bundle discount. The tier tops out at
// 30% of three upsell pieces; at today's catalogue that is well under ₹2,000.
// A generous cap still makes a tampered payload harmless.
const BUNDLE_DISCOUNT_CAP = 5000;

// Browser-only identifiers the client hands us so the server-side Meta Purchase
// can match as well as the browser one (see lib/analytics/capi.ts).
type CheckoutTrackingPayload = {
  externalId?: string;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
  contentIds?: string[];
  contents?: { id: string; quantity: number; item_price: number }[];
  numItems?: number;
  value?: number;
};

const normalizeText = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const getWixErrorMessage = (err: unknown) => {
  const e = err as
    | { details?: { applicationError?: { description?: string; code?: string } }; message?: string }
    | undefined;
  return (
    e?.details?.applicationError?.description ||
    e?.details?.applicationError?.code ||
    e?.message ||
    "Unknown Wix error"
  );
};

const splitName = (fullName: string) => {
  const parts = fullName.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || fullName,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
  };
};

// Wix nests calculation errors unpredictably — flatten whatever shape arrives.
const flattenCalculationErrors = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(flattenCalculationErrors);
  if (typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  const keys = ["description", "message", "code", "field", "violatedRule"];
  const ownMessages = keys
    .map((k) => record[k])
    .filter((i): i is string => typeof i === "string" && i.trim().length > 0);

  return [
    ...ownMessages,
    ...Object.entries(record)
      .filter(([key]) => !keys.includes(key))
      .flatMap(([, nested]) => flattenCalculationErrors(nested)),
  ];
};

export async function POST(req: Request) {
  // Only our own checkout may place orders, and not in a burst. Ten per ten
  // minutes per IP leaves a real shopper plenty of retries.
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (isRateLimited(`checkout:${clientIp(req)}`, 10)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const details = body?.details as Partial<CheckoutAddressPayload> | undefined;

    const email = normalizeText(details?.email);
    const fullName = normalizeText(details?.fullName);
    const phone = normalizeText(details?.phone);
    const addressLine1 = normalizeText(details?.addressLine1);
    const addressLine2 = normalizeText(details?.addressLine2);
    const city = normalizeText(details?.city);
    const state = normalizeText(details?.state);
    const postalCode = normalizeText(details?.postalCode);
    const paymentMethod = details?.paymentMethod === "PREPAID" ? "PREPAID" : "COD";
    const razorpayPaymentId = normalizeText(details?.razorpayPaymentId);

    // The coupon code rides along so the owner sees it on the Wix order.
    const couponCode = normalizeText(body?.couponCode).toUpperCase();

    // Sacred Bundle discount (₹). Not a Wix coupon — reconciled below as a
    // GLOBAL custom discount, exactly like the prepaid −₹49. Clamped and
    // re-rounded server-side: this arrives from the browser, so it is treated as
    // a request, not as truth. BUNDLE_DISCOUNT_CAP is the ceiling any legitimate
    // 30%-of-three-items tier can reach. While the upsell is switched off no real
    // order can earn one, so a request claiming it is ignored outright.
    const bundleDiscount = UPSELL_ENABLED
      ? Math.min(
          BUNDLE_DISCOUNT_CAP,
          Math.max(0, Math.round(Number(body?.bundleDiscount) || 0)),
        )
      : 0;

    if (!email || !fullName || !phone || !addressLine1 || !city || !state || !postalCode) {
      return NextResponse.json(
        { error: "Missing checkout contact or shipping details." },
        { status: 400 },
      );
    }

    const checkoutId = normalizeText(body?.checkoutId);

    // ------------------------------------------------ Prepaid: prove the payment
    // A prepaid order is only ever built on a payment Razorpay itself reports as
    // successful and unused. The browser's word is not enough: this used to mark
    // the Wix order PAID (and take the prepaid discount off) for any string it was sent. The
    // amount is checked further down, once Wix has priced the checkout.
    let payment: VerifiedPayment | null = null;
    if (paymentMethod === "PREPAID") {
      const check = await verifyPrepaidPayment(razorpayPaymentId);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: check.status });
      }
      payment = check.payment;
    }
    // Rupees Razorpay actually took — replaces the amount the browser used to send.
    const razorpayAmount = payment ? payment.amount.toFixed(2) : "";
    // Only a verified payment id is ever written onto an order or an email.
    const paidPaymentId = payment ? payment.id : "";

    // ------------------------------------------------- Meta Purchase (server)
    // The browser also fires Purchase, but ad blockers, a crashed tab or a
    // shopper closing the page mid-redirect kill it — and Purchase is the one
    // event the ad account is actually optimised against. This copy leaves from
    // the server, where none of that applies.
    //
    // `event_id` is `purchase-<orderId>`, byte-identical to the browser's, which
    // is how Meta collapses the two into ONE conversion rather than counting the
    // order twice. Runs in `after()` so it can never slow down (or fail) the
    // response the shopper is waiting on.
    const tracking = (body?.tracking || {}) as CheckoutTrackingPayload;
    const trackPurchase = (orderId: string, value: number) => {
      if (!CAPI_ENABLED) return;
      const nameParts = fullName.split(/\s+/).filter(Boolean);
      after(async () => {
        try {
          await sendMetaEvent({
            eventName: "Purchase",
            eventId: `purchase-${orderId}`,
            eventSourceUrl: tracking.eventSourceUrl,
            userData: {
              email,
              phone,
              firstName: nameParts[0] || undefined,
              lastName:
                nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined,
              city,
              state,
              zip: postalCode,
              country: "IN",
              externalId: tracking.externalId,
              fbp: tracking.fbp,
              fbc: tracking.fbc,
              ...requestContext(req),
            },
            customData: {
              currency: "INR",
              value,
              content_type: "product",
              order_id: orderId,
              ...(tracking.contentIds?.length
                ? { content_ids: tracking.contentIds }
                : {}),
              ...(tracking.contents?.length ? { contents: tracking.contents } : {}),
              ...(tracking.numItems ? { num_items: tracking.numItems } : {}),
            },
          });
        } catch (e) {
          // The order is already placed — a tracking failure is not an order
          // failure and must never be treated as one.
          console.error("Server-side Meta Purchase failed (order is safe):", e);
        }
      });
    };

    // ------------------------------------------------------------------ MOCK
    // No Wix admin key: synthesise the order and email from the client-supplied
    // cart. This is what runs pre-keys — and ONLY pre-keys. It used to run
    // whenever a request simply left out `checkoutId`, which on the live site let
    // anyone make our Gmail send an "order confirmation" to any address and post
    // a Purchase of any value to the live Meta pixel.
    if (WIX_ADMIN_ENABLED && !checkoutId) {
      return NextResponse.json(
        { error: "Your checkout session expired. Please refresh and try again." },
        { status: 400 },
      );
    }
    if (!WIX_ADMIN_ENABLED) {
      const items = (Array.isArray(body?.items) ? body.items : []) as
        OrderEmailParams["items"];
      const summary = (body?.summary || {}) as OrderEmailParams["summary"];
      const amount = normalizeText(body?.amount) || summary?.total || "0";

      const orderId = `MOCK-${Date.now().toString(36).toUpperCase()}`;
      const orderNumber = `#${orderId.slice(-8)}`;
      const orderDate = new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      await sendOrderConfirmationEmail({
        to: email,
        customerName: fullName,
        orderNumber,
        orderDate,
        paymentMethod,
        amount,
        razorpayPaymentId: paidPaymentId || undefined,
        items,
        summary,
        address: { line1: addressLine1, city, state, postalCode },
        phone,
      }).catch((e) => console.error("Mock order email failed:", e));

      trackPurchase(orderId, Number(amount) || tracking.value || 0);

      return NextResponse.json({ orderId, orderNumber, mock: true });
    }

    // ------------------------------------------------------------------ LIVE
    // Full Wix order creation. Only reached when the admin key + a real Wix
    // checkoutId are present. (Bundle §8, ported verbatim in spirit.)
    const { wixAdminClientServer } = await import("@/lib/wixAdminClientServer");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wixClient = wixAdminClientServer() as any;
    const contactDetails = splitName(fullName);
    const address = {
      country: "IN",
      addressLine1,
      ...(addressLine2 ? { addressLine2 } : {}),
      city,
      subdivision: normalizeSubdivision(state),
      postalCode,
    };

    // 1. Stamp buyer / billing / shipping onto the Wix checkout.
    let updatedCheckout = await wixClient.checkout.updateCheckout(checkoutId, {
      billingInfo: { address, contactDetails: { ...contactDetails, phone } },
      shippingInfo: {
        shippingDestination: {
          address,
          contactDetails: { ...contactDetails, phone },
        },
      },
      buyerInfo: { email },
      buyerNote:
        (paymentMethod === "COD"
          ? `Payment: Cash on Delivery (COD). Phone: ${phone}. Pincode: ${postalCode}.`
          : `Payment: Prepaid. Phone: ${phone}. Pincode: ${postalCode}.` +
            (paidPaymentId ? ` Razorpay Payment ID: ${paidPaymentId}.` : "") +
            (razorpayAmount ? ` Amount paid: ${razorpayAmount}.` : "")),
      customFields: [
        {
          title: "Payment Method",
          value: paymentMethod === "COD" ? "Cash on Delivery" : "Prepaid (Razorpay)",
        },
        { title: "Customer Phone", value: phone },
        ...(paidPaymentId
          ? [{ title: "Razorpay Payment ID", value: paidPaymentId }]
          : []),
        ...(razorpayAmount ? [{ title: "Amount Paid", value: razorpayAmount }] : []),
        ...(couponCode ? [{ title: "Coupon", value: couponCode }] : []),
        ...(bundleDiscount > 0
          ? [{ title: "Sacred Bundle", value: `−₹${bundleDiscount}` }]
          : []),
      ],
    });

    // 2. Auto-select a shipping option — Wix REFUSES createOrder without one.
    // Skip when step 1 already came back with one selected: each updateCheckout is
    // a ~1s round-trip, and this is the only one of the four order calls that is
    // ever avoidable. Cannot be merged into step 1 — the options to choose from
    // only exist in step 1's response.
    const shippingOptions =
      updatedCheckout?.shippingInfo?.carrierServiceOptions || [];
    const alreadySelected =
      updatedCheckout?.shippingInfo?.selectedCarrierServiceOption;
    if (!alreadySelected && shippingOptions.length > 0) {
      updatedCheckout = await wixClient.checkout.updateCheckout(checkoutId, {
        shippingInfo: {
          ...updatedCheckout.shippingInfo,
          selectedCarrierServiceOption: shippingOptions[0],
        },
      });
    }

    // 3. Bail early on calculation errors (else createOrder fails opaquely).
    const calcErrors = Array.from(
      new Set(flattenCalculationErrors(updatedCheckout?.calculationErrors)),
    );
    if (calcErrors.length > 0) {
      return NextResponse.json(
        { error: `Wix checkout calculation errors: ${calcErrors.join("; ")}` },
        { status: 422 },
      );
    }

    const prepaidDiscountAmount = payment ? PREPAID_DISCOUNT : 0;

    // 3b. Prepaid: the payment must cover THIS order, before any order exists.
    // Wix's checkout total already carries the coupon; the adjustments made in
    // step 5 are applied on top exactly as the shopper was quoted.
    if (payment) {
      const expectedTotal =
        Number(updatedCheckout?.priceSummary?.total?.amount) -
        prepaidDiscountAmount -
        bundleDiscount;
      if (!paymentCoversTotal(payment.amount, expectedTotal)) {
        console.error(
          `Prepaid amount mismatch: paid ${payment.amount}, order ${expectedTotal}, payment ${payment.id}`,
        );
        return NextResponse.json(
          {
            error: `The amount paid doesn't match your order total. No order was placed — please contact us with payment ID ${payment.id}.`,
          },
          { status: 402 },
        );
      }
      try {
        await capturePayment(payment);
        // Burn the payment id against this checkout BEFORE the order exists, so a
        // replay racing this request is refused by verifyPrepaidPayment.
        await markPaymentUsed(payment.id, checkoutId);
      } catch (e) {
        console.error("Razorpay capture failed:", e);
        return NextResponse.json(
          { error: `We couldn't complete your payment. No order was placed — please contact us with payment ID ${payment.id}.` },
          { status: 502 },
        );
      }
    }

    // 4. Create + approve the order.
    const orderResult = await wixClient.checkout.createOrder(checkoutId);
    const orderId =
      orderResult?.orderId || orderResult?.order?._id || orderResult?._id;

    if (!orderId) {
      return NextResponse.json(
        { error: "Wix created the order but returned no order ID." },
        { status: 502 },
      );
    }

    // From here on the order EXISTS in Wix. Nothing below may turn it into a
    // failed response — the shopper would see "failed", miss the confirmation
    // page and maybe order twice. Approving is best-effort: Wix may already have
    // approved it (COD orders from a checkout usually are) and refuse a repeat.
    let approvedOrderResult: Awaited<ReturnType<typeof wixClient.orders.updateOrderStatus>> | null = null;
    try {
      approvedOrderResult = await wixClient.orders.updateOrderStatus(orderId, "APPROVED");
    } catch (approveErr) {
      console.error("Approving the Wix order failed (order is placed):", orderId, approveErr);
    }

    const wixOrderTotal = Number(
      updatedCheckout?.priceSummary?.total?.amount ??
        approvedOrderResult?.order?.priceSummary?.total?.amount ??
        orderResult?.order?.priceSummary?.total?.amount,
    );

    // 5. Order adjustments via ONE draft-order edit (see §8 for the rationale).
    // Coupons are already applied natively on the checkout, so wixOrderTotal has
    // them. Two things Wix doesn't know about are reconciled here:
    //   • prepaid −₹49 — the flat online-payment discount (prepaid only; it's not
    //     a Wix coupon),
    //   • Sacred Bundle — the checkout upsell tier (10/15/30% of the added
    //     pieces). Also not a Wix coupon, so without this the shopper would be
    //     billed the undiscounted total they were never quoted.
    // Best-effort: on any failure the original order stands. Never blocks the order.
    let finalTotal = wixOrderTotal;
    let committedOrder: Record<string, unknown> | null = null;
    let discountApplied = false;

    if (prepaidDiscountAmount > 0 || bundleDiscount > 0) {
      try {
        const draftRes = await wixClient.draftOrders.createDraftOrder({
          sourceOrderId: orderId,
        });
        const draftId =
          draftRes?.calculatedDraftOrder?.draftOrder?._id ||
          draftRes?.draftOrder?._id;
        if (!draftId) throw new Error("Draft order id missing from response.");

        if (prepaidDiscountAmount > 0 || bundleDiscount > 0) {
          await wixClient.draftOrders.createCustomDiscounts(draftId, {
            discounts: [
              ...(prepaidDiscountAmount > 0
                ? [
                    {
                      priceAmount: { amount: prepaidDiscountAmount.toFixed(2) },
                      discountType: "GLOBAL" as const,
                      applyToDraftOrder: true,
                      description: "Online payment discount",
                    },
                  ]
                : []),
              ...(bundleDiscount > 0
                ? [
                    {
                      priceAmount: { amount: bundleDiscount.toFixed(2) },
                      discountType: "GLOBAL" as const,
                      applyToDraftOrder: true,
                      description: "Sacred Bundle discount",
                    },
                  ]
                : []),
            ],
          });
        }

        const commitRes = await wixClient.draftOrders.commitDraftOrder(draftId, {
          commitSettings: {
            sendNotificationsToBuyer: false,
            sendNotificationsToBusiness: false,
          },
          reason: "Online payment / Sacred Bundle adjustment",
        });

        committedOrder = commitRes?.orderAfterCommit || null;
        const committedTotal = committedOrder?.priceSummary as
          | { total?: { amount?: string } }
          | undefined;
        const fallbackTotal =
          Number.isFinite(wixOrderTotal)
            ? wixOrderTotal -
              prepaidDiscountAmount -
              bundleDiscount
            : (payment?.amount ?? NaN);
        finalTotal =
          committedTotal?.total?.amount != null
            ? Number(committedTotal.total.amount)
            : fallbackTotal;
        discountApplied = true;
      } catch (adjErr) {
        console.error("Order adjustment (draft edit) failed:", adjErr);
        // Prepaid: what was actually paid. COD: the unadjusted Wix total. (This
        // used to read Number("") = 0 for COD, reporting a ₹0 order.)
        finalTotal = payment ? payment.amount : wixOrderTotal;
      }
    }

    // 6. Record the payment so the order reads as PAID for finalTotal.
    let paymentMarkedPaid = false;
    if (payment) {
      try {
        if (Number.isFinite(finalTotal) && finalTotal > 0) {
          await wixClient.orderTransactions.addPayments(orderId, [
            {
              amount: { amount: finalTotal.toFixed(2) },
              regularPaymentDetails: {
                offlinePayment: true,
                status: "APPROVED",
                paymentMethod: "Razorpay",
                providerTransactionId: paidPaymentId,
              },
            },
          ]);
          paymentMarkedPaid = true;
        }
      } catch (payErr) {
        console.error("Failed to mark prepaid Wix order as paid:", payErr);
      }
    }

    // The shopper-facing order number ("#1234"), also returned to the success page.
    let orderNumberForShopper: string | undefined;

    // 7. Confirmation email (the "webhook" — fired inline).
    try {
      const finalOrder =
        committedOrder ||
        approvedOrderResult?.order ||
        orderResult?.order;

      const emailAmount = Number.isFinite(finalTotal) ? finalTotal : wixOrderTotal;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (((finalOrder as any)?.lineItems as any[]) || []).map((li) => ({
        name: li?.productName?.original || li?.productName?.translated || "Item",
        quantity: Number(li?.quantity) || 1,
        sku: li?.physicalProperties?.sku || li?.catalogReference?.options?.sku || undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options: ((li?.descriptionLines as any[]) || [])
          .map((dl) => ({
            name: dl?.name?.original || dl?.name?.translated || "",
            value:
              dl?.colorInfo?.original ||
              dl?.colorInfo?.translated ||
              dl?.plainText?.original ||
              dl?.plainText?.translated ||
              "",
          }))
          .filter((o) => o.name && o.value),
        unitPrice: li?.price?.amount || undefined,
        lineTotal:
          li?.totalPriceAfterTax?.amount ||
          li?.totalPriceBeforeTax?.amount ||
          li?.price?.amount ||
          undefined,
        image: li?.image || undefined,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fo = finalOrder as any;
      const rawOrderNumber = fo?.number;
      const hasValidOrderNumber =
        rawOrderNumber != null &&
        String(rawOrderNumber).trim() !== "" &&
        String(rawOrderNumber).trim() !== "0";
      const orderNumber = hasValidOrderNumber
        ? `#${rawOrderNumber}`
        : `#${String(orderId).slice(-8)}`;
      orderNumberForShopper = orderNumber;

      const ps = fo?.priceSummary || {};
      const summary = {
        subtotal: ps?.subtotal?.amount || undefined,
        shipping: ps?.shipping?.amount || undefined,
        tax: ps?.tax?.amount || undefined,
        discount: ps?.discount?.amount || undefined,
        total:
          ps?.total?.amount ||
          (Number.isFinite(emailAmount) ? emailAmount.toFixed(2) : undefined),
      };

      const createdDate = fo?._createdDate || fo?.createdDate || Date.now();
      const orderDate = new Date(createdDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      // Send AFTER the response. The order is already created and approved in Wix
      // by this point, so the shopper should not sit on a spinner waiting for a
      // Gmail SMTP handshake — that was several seconds of dead time before the
      // confirmation page appeared. `after` (not a floating promise) keeps the
      // work alive past the response even on serverless, so the mail still sends.
      const emailParams: OrderEmailParams = {
        to: email,
        customerName: fullName,
        orderNumber,
        orderDate,
        paymentMethod,
        amount: (Number.isFinite(emailAmount) ? emailAmount : 0).toFixed(2),
        razorpayPaymentId: paidPaymentId || undefined,
        items,
        summary,
        address: { line1: addressLine1, city, state, postalCode },
        phone,
      };
      after(async () => {
        try {
          await sendOrderConfirmationEmail(emailParams);
        } catch (e) {
          // Never surface this to the buyer: the order is already placed, and a
          // failed email must not read as a failed purchase.
          console.error("Order confirmation email failed (order is safe):", e);
        }
      });
    } catch (emailErr) {
      console.error("Order confirmation email step failed:", emailErr);
    }

    // Prefer the total Wix actually settled on; fall back to what the browser
    // quoted so a Purchase is never reported with value 0.
    trackPurchase(
      String(orderId),
      Number.isFinite(finalTotal) && finalTotal > 0
        ? finalTotal
        : Number.isFinite(wixOrderTotal) && wixOrderTotal > 0
          ? wixOrderTotal
          : tracking.value || 0,
    );

    return NextResponse.json({
      checkoutId,
      orderId,
      orderNumber: orderNumberForShopper,
      paymentMarkedPaid,
      discountApplied,
      finalTotal: Number.isFinite(finalTotal) ? finalTotal : undefined,
    });
  } catch (err: unknown) {
    console.error("Wix checkout finalization failed:", err);
    return NextResponse.json({ error: getWixErrorMessage(err) }, { status: 500 });
  }
}
