import { NextResponse, after } from "next/server";
import { WIX_ADMIN_ENABLED } from "@/lib/commerce/config";
import { GIFT_WRAP_FEE, PREPAID_DISCOUNT } from "@/lib/commerce/pricing";
import {
  sendOrderConfirmationEmail,
  type OrderEmailParams,
} from "@/lib/orderEmail";

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
  razorpayAmount?: string;
};

// Ceiling on the client-supplied Sacred Bundle discount. The tier tops out at
// 30% of three upsell pieces; at today's catalogue that is well under ₹2,000.
// A generous cap still makes a tampered payload harmless.
const BUNDLE_DISCOUNT_CAP = 5000;

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

// Wix requires ISO 3166-2 subdivision CODES, not free text.
const subdivisionCodes: Record<string, string> = {
  "andhra pradesh": "IN-AP",
  assam: "IN-AS",
  bihar: "IN-BR",
  chhattisgarh: "IN-CT",
  delhi: "IN-DL",
  goa: "IN-GA",
  gujarat: "IN-GJ",
  haryana: "IN-HR",
  "himachal pradesh": "IN-HP",
  jharkhand: "IN-JH",
  karnataka: "IN-KA",
  kerala: "IN-KL",
  "madhya pradesh": "IN-MP",
  maharashtra: "IN-MH",
  odisha: "IN-OR",
  punjab: "IN-PB",
  rajasthan: "IN-RJ",
  "tamil nadu": "IN-TN",
  telangana: "IN-TG",
  "uttar pradesh": "IN-UP",
  uttarakhand: "IN-UT",
  "west bengal": "IN-WB",
};

const normalizeSubdivision = (state: string) => {
  const normalized = state.trim();
  if (/^IN-[A-Z]{2}$/i.test(normalized)) return normalized.toUpperCase();
  return subdivisionCodes[normalized.toLowerCase()] || normalized;
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
    const razorpayAmount = normalizeText(details?.razorpayAmount);

    // Gift wrap + note and the coupon code ride along so the owner sees them on
    // the Wix order (gift wrap is otherwise invisible server-side).
    const giftWrap = body?.giftWrap === true;
    const giftNote = normalizeText(body?.giftNote);
    const couponCode = normalizeText(body?.couponCode).toUpperCase();

    // Sacred Bundle discount (₹). Not a Wix coupon — reconciled below as a
    // GLOBAL custom discount, exactly like the prepaid −₹50. Clamped and
    // re-rounded server-side: this arrives from the browser, so it is treated as
    // a request, not as truth. BUNDLE_DISCOUNT_CAP is the ceiling any legitimate
    // 30%-of-three-items tier can reach.
    const bundleDiscount = Math.min(
      BUNDLE_DISCOUNT_CAP,
      Math.max(0, Math.round(Number(body?.bundleDiscount) || 0)),
    );

    if (!email || !fullName || !phone || !addressLine1 || !city || !state || !postalCode) {
      return NextResponse.json(
        { error: "Missing checkout contact or shipping details." },
        { status: 400 },
      );
    }

    const checkoutId = normalizeText(body?.checkoutId);

    // ------------------------------------------------------------------ MOCK
    // No Wix admin key (or no checkoutId): synthesise the order and email from the
    // client-supplied cart. This is what runs pre-keys.
    if (!WIX_ADMIN_ENABLED || !checkoutId) {
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
        razorpayPaymentId: razorpayPaymentId || undefined,
        items,
        summary,
        giftNote: giftWrap && giftNote ? giftNote : undefined,
        address: { line1: addressLine1, city, state, postalCode },
        phone,
      }).catch((e) => console.error("Mock order email failed:", e));

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
      // Lead the buyer note with the gift message so it's the first thing the
      // owner reads on the Wix order — that's the whole point of collecting it.
      buyerNote:
        (giftWrap && giftNote ? `🎁 GIFT NOTE: "${giftNote}"\n` : "") +
        (giftWrap ? `Gift wrap requested (+₹${GIFT_WRAP_FEE}).\n` : "") +
        (paymentMethod === "COD"
          ? `Payment: Cash on Delivery (COD). Phone: ${phone}. Pincode: ${postalCode}.`
          : `Payment: Prepaid. Phone: ${phone}. Pincode: ${postalCode}.` +
            (razorpayPaymentId ? ` Razorpay Payment ID: ${razorpayPaymentId}.` : "") +
            (razorpayAmount ? ` Amount paid: ${razorpayAmount}.` : "")),
      customFields: [
        {
          title: "Payment Method",
          value: paymentMethod === "COD" ? "Cash on Delivery" : "Prepaid (Razorpay)",
        },
        { title: "Customer Phone", value: phone },
        ...(razorpayPaymentId
          ? [{ title: "Razorpay Payment ID", value: razorpayPaymentId }]
          : []),
        ...(razorpayAmount ? [{ title: "Amount Paid", value: razorpayAmount }] : []),
        ...(couponCode ? [{ title: "Coupon", value: couponCode }] : []),
        ...(bundleDiscount > 0
          ? [{ title: "Sacred Bundle", value: `−₹${bundleDiscount}` }]
          : []),
        ...(giftWrap ? [{ title: "Gift Wrap", value: "Yes (+₹149)" }] : []),
        ...(giftWrap && giftNote ? [{ title: "Gift Note", value: giftNote }] : []),
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

    const approvedOrderResult = await wixClient.orders.updateOrderStatus(
      orderId,
      "APPROVED",
    );

    const wixOrderTotal = Number(
      updatedCheckout?.priceSummary?.total?.amount ??
        approvedOrderResult?.order?.priceSummary?.total?.amount ??
        orderResult?.order?.priceSummary?.total?.amount,
    );

    // 5. Order adjustments via ONE draft-order edit (see §8 for the rationale).
    // Coupons are already applied natively on the checkout, so wixOrderTotal has
    // them. Two things Wix doesn't know about are reconciled here:
    //   • gift wrap  — a real +₹149 charge (both COD and prepaid),
    //   • prepaid −₹50 — the flat online-payment discount (prepaid only; it's not
    //     a Wix coupon),
    //   • Sacred Bundle — the checkout upsell tier (10/15/30% of the added
    //     pieces). Also not a Wix coupon, so without this the shopper would be
    //     billed the undiscounted total they were never quoted.
    // Best-effort: on any failure the original order stands. Never blocks the order.
    let finalTotal = wixOrderTotal;
    let committedOrder: Record<string, unknown> | null = null;
    let discountApplied = false;

    const giftWrapAmount = giftWrap ? GIFT_WRAP_FEE : 0;
    const prepaidDiscountAmount =
      paymentMethod === "PREPAID" && razorpayPaymentId ? PREPAID_DISCOUNT : 0;

    if (giftWrapAmount > 0 || prepaidDiscountAmount > 0 || bundleDiscount > 0) {
      try {
        const draftRes = await wixClient.draftOrders.createDraftOrder({
          sourceOrderId: orderId,
        });
        const draftId =
          draftRes?.calculatedDraftOrder?.draftOrder?._id ||
          draftRes?.draftOrder?._id;
        if (!draftId) throw new Error("Draft order id missing from response.");

        if (giftWrapAmount > 0) {
          // Embed a preview of the note in the fee name (Wix caps it at 50 chars)
          // so it's visible right on the charge line; the full note lives in the
          // buyer note + the "Gift Note" custom field.
          const notePreview = giftNote
            ? `: "${giftNote.slice(0, 30)}${giftNote.length > 30 ? "…" : ""}"`
            : "";
          await wixClient.draftOrders.createCustomAdditionalFees(draftId, {
            customAdditionalFees: [
              {
                name: `Gift wrap${notePreview}`.slice(0, 50),
                price: { amount: giftWrapAmount.toFixed(2) },
                applyToDraftOrder: true,
              },
            ],
          });
        }

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
          reason: "Gift wrap / online payment / Sacred Bundle adjustment",
        });

        committedOrder = commitRes?.orderAfterCommit || null;
        const committedTotal = committedOrder?.priceSummary as
          | { total?: { amount?: string } }
          | undefined;
        const fallbackTotal =
          Number.isFinite(wixOrderTotal)
            ? wixOrderTotal +
              giftWrapAmount -
              prepaidDiscountAmount -
              bundleDiscount
            : Number(razorpayAmount);
        finalTotal =
          committedTotal?.total?.amount != null
            ? Number(committedTotal.total.amount)
            : fallbackTotal;
        discountApplied = true;
      } catch (adjErr) {
        console.error("Order adjustment (draft edit) failed:", adjErr);
        finalTotal = Number.isFinite(Number(razorpayAmount))
          ? Number(razorpayAmount)
          : wixOrderTotal;
      }
    }

    // 6. Record the payment so the order reads as PAID for finalTotal.
    let paymentMarkedPaid = false;
    if (paymentMethod === "PREPAID" && razorpayPaymentId) {
      try {
        if (Number.isFinite(finalTotal) && finalTotal > 0) {
          await wixClient.orderTransactions.addPayments(orderId, [
            {
              amount: { amount: finalTotal.toFixed(2) },
              regularPaymentDetails: {
                offlinePayment: true,
                status: "APPROVED",
                paymentMethod: "Razorpay",
                providerTransactionId: razorpayPaymentId,
              },
            },
          ]);
          paymentMarkedPaid = true;
        }
      } catch (payErr) {
        console.error("Failed to mark prepaid Wix order as paid:", payErr);
      }
    }

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

      const ps = fo?.priceSummary || {};
      const summary = {
        subtotal: ps?.subtotal?.amount || undefined,
        shipping: ps?.shipping?.amount || undefined,
        tax: ps?.tax?.amount || undefined,
        discount: ps?.discount?.amount || undefined,
        giftWrap: giftWrapAmount > 0 ? String(giftWrapAmount) : undefined,
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
        razorpayPaymentId: razorpayPaymentId || undefined,
        items,
        summary,
        giftNote: giftWrap && giftNote ? giftNote : undefined,
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

    return NextResponse.json({
      checkoutId,
      orderId,
      paymentMarkedPaid,
      discountApplied,
      finalTotal: Number.isFinite(finalTotal) ? finalTotal : undefined,
    });
  } catch (err: unknown) {
    console.error("Wix checkout finalization failed:", err);
    return NextResponse.json({ error: getWixErrorMessage(err) }, { status: 500 });
  }
}
