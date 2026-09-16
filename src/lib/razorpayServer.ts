import "server-only";
import Razorpay from "razorpay";
import { RAZORPAY_ENABLED } from "@/lib/commerce/config";

// ============================================================================
// Server-side Razorpay — the one place the secret key is turned into a client.
//
// `verifyPrepaidPayment` exists because /api/checkout used to take a
// `razorpayPaymentId` from the browser on trust: any string marked the Wix order
// PAID and knocked ₹50 off, even with prepaid switched off. The only proof a
// payment is real is Razorpay's own record of it, so that's what we read.
// ============================================================================

export const razorpayServer = (): Razorpay | null => {
  if (!RAZORPAY_ENABLED) return null;
  return new Razorpay({
    key_id: (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
};

/** Note key stamped on a payment once it has paid for a checkout (reuse guard). */
const USED_NOTE = "ojara_checkout_id";

export type VerifiedPayment = {
  id: string;
  /** Rupees actually paid. */
  amount: number;
  status: "authorized" | "captured";
};

export type PaymentCheck =
  | { ok: true; payment: VerifiedPayment }
  | { ok: false; status: number; error: string };

/**
 * Confirm a Razorpay payment is genuine, successful, in INR, and hasn't already
 * paid for another order. Amount is NOT checked here — the expected total is only
 * known once Wix has priced the checkout; see `paymentCoversTotal`.
 */
export const verifyPrepaidPayment = async (
  paymentId: string,
): Promise<PaymentCheck> => {
  const rzp = razorpayServer();
  if (!rzp) {
    return { ok: false, status: 400, error: "Online payment isn't available right now." };
  }
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
    return { ok: false, status: 400, error: "Invalid payment reference." };
  }

  try {
    const p = await rzp.payments.fetch(paymentId);
    if (p.status !== "captured" && p.status !== "authorized") {
      return { ok: false, status: 402, error: "This payment was not completed." };
    }
    if (p.currency !== "INR") {
      return { ok: false, status: 400, error: "Unexpected payment currency." };
    }
    if (p.notes && typeof p.notes === "object" && USED_NOTE in p.notes) {
      return { ok: false, status: 409, error: "This payment has already been used for an order." };
    }
    return {
      ok: true,
      payment: { id: p.id, amount: Number(p.amount) / 100, status: p.status },
    };
  } catch (e) {
    console.error("Razorpay payment lookup failed:", e);
    return { ok: false, status: 502, error: "Couldn't confirm your payment with Razorpay." };
  }
};

/** Paid amount matches the order total, to within ₹1 of rounding. */
export const paymentCoversTotal = (paid: number, expectedTotal: number): boolean =>
  Number.isFinite(expectedTotal) && Math.abs(paid - expectedTotal) <= 1;

/**
 * Capture an authorized payment (accounts without auto-capture). Without this an
 * authorized payment is auto-refunded by Razorpay after a few days — after the
 * order may already have shipped.
 */
export const capturePayment = async (payment: VerifiedPayment): Promise<void> => {
  if (payment.status !== "authorized") return;
  const rzp = razorpayServer();
  if (!rzp) throw new Error("Razorpay not configured.");
  await rzp.payments.capture(payment.id, Math.round(payment.amount * 100), "INR");
};

/**
 * Stamp the Wix checkout id onto the payment so the same payment id can't be
 * replayed for a second order. Called before the order is created. Best-effort:
 * a failure here is logged, never surfaced — the amount check still holds.
 */
export const markPaymentUsed = async (paymentId: string, checkoutId: string): Promise<void> => {
  const rzp = razorpayServer();
  if (!rzp) return;
  try {
    await rzp.payments.edit(paymentId, { notes: { [USED_NOTE]: checkoutId } });
  } catch (e) {
    console.error("Couldn't mark Razorpay payment as used (order is safe):", e);
  }
};
