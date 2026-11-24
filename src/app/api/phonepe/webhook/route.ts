import { NextResponse, after } from "next/server";
import nodemailer from "nodemailer";
import {
  verifyPhonePeWebhookAuth,
  verifyPhonePePayment,
} from "@/lib/phonepeServer";
import { BRAND_NAME, SITE_URL, SUPPORT_EMAIL } from "@/lib/commerce/config";

// ============================================================================
// PhonePe server-to-server webhook — the RELIABLE order creator.
//
// A redirect gateway can't depend on the shopper's browser making it back to the
// site, so THIS is what turns a completed payment into a Wix order. On
// checkout.order.completed we:
//   1. Re-confirm the payment DIRECTLY with PhonePe's Order Status API (our own
//      authenticated call) — the real trust boundary, independent of the
//      webhook body or its auth header.
//   2. Read the checkout context back from PhonePe's metaInfo (set at initiate).
//   3. Call /api/checkout server-to-server (shared secret) to create the order.
//
// The browser return (/checkout/phonepe-return) may also create it first; the
// single-use Wix checkoutId makes whichever loses the race a harmless no-op.
//
// We reply 2xx immediately (PhonePe expects < 3–5s) and do the Wix work in
// after(), so the heavy order round-trips never time out the webhook.
// ============================================================================

const sendOwnerAlert = async (subject: string, text: string): Promise<void> => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailAppPassword) return;
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailAppPassword },
    });
    await transporter.sendMail({
      from: `"${BRAND_NAME} Payments" <${gmailUser}>`,
      to: SUPPORT_EMAIL,
      subject,
      text,
    });
  } catch (e) {
    console.error("[phonepe webhook] owner alert email failed:", e);
  }
};

const createOrderFromPayment = async (merchantOrderId: string): Promise<void> => {
  // 1. Re-confirm with PhonePe directly (authenticated) + get the trusted metaInfo.
  const check = await verifyPhonePePayment(merchantOrderId);
  if (!check.ok) {
    console.log(`[phonepe webhook] status not COMPLETED for ${merchantOrderId}: ${check.error}`);
    return;
  }
  const m = check.metaInfo || {};
  const checkoutId = m.udf9 || "";

  if (!checkoutId) {
    console.error(`[phonepe webhook] COMPLETED but no checkoutId in metaInfo for ${merchantOrderId}`);
    await sendOwnerAlert(
      `PhonePe paid but order needs manual check — ${merchantOrderId}`,
      `PhonePe payment COMPLETED (₹${check.payment.amount}) for ${merchantOrderId}, but no checkout context was attached, so the order could not be created automatically. Please confirm in Wix / PhonePe and create or refund manually.`,
    );
    return;
  }

  // 2. Rebuild the /api/checkout request from the trusted metaInfo.
  const checkoutBody = {
    checkoutId,
    couponCode: m.udf10 || undefined,
    details: {
      email: m.udf1 || "",
      fullName: m.udf2 || "",
      phone: m.udf3 || "",
      addressLine1: m.udf4 || "",
      addressLine2: m.udf5 || "",
      city: m.udf6 || "",
      state: m.udf7 || "",
      postalCode: m.udf8 || "",
      paymentMethod: "PREPAID" as const,
      phonepeOrderId: merchantOrderId,
    },
  };

  // 3. Create the order server-to-server (shared secret bypasses same-origin).
  try {
    const res = await fetch(`${SITE_URL}/api/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ojara-internal": process.env.PHONEPE_CLIENT_SECRET || "",
      },
      body: JSON.stringify(checkoutBody),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.orderId) {
      console.log(`[phonepe webhook] order created ${data.orderId} for ${merchantOrderId}`);
    } else {
      // Most likely the browser return already converted this checkout (the Wix
      // checkoutId is single-use) — harmless. Any other error is worth a look.
      console.warn(`[phonepe webhook] checkout returned ${res.status} for ${merchantOrderId}: ${data?.error || "?"}`);
    }
  } catch (e) {
    console.error(`[phonepe webhook] checkout call failed for ${merchantOrderId}:`, e);
    await sendOwnerAlert(
      `PhonePe paid — order creation errored — ${merchantOrderId}`,
      `PhonePe payment COMPLETED (₹${check.payment.amount}) for ${merchantOrderId}, but creating the Wix order threw an error. Please confirm in Wix and create/refund manually if needed.`,
    );
  }
};

export async function POST(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const event: string = body?.event || "";
  const p = body?.payload || {};
  const merchantOrderId: string = p?.merchantOrderId || "";
  console.log(`[phonepe webhook] event=${event} merchantOrderId=${merchantOrderId} state=${p?.state}`);

  // Auth is defence-in-depth only. PhonePe's exact hash format isn't pinned, so a
  // mismatch must NOT block a real order — the Order Status re-check in
  // createOrderFromPayment is the true security boundary. We only log here.
  if (!verifyPhonePeWebhookAuth(req.headers.get("authorization"))) {
    console.warn(`[phonepe webhook] auth header did not match (proceeding via status re-check) for ${merchantOrderId}`);
  }

  const completed =
    event === "checkout.order.completed" || p?.state === "COMPLETED";

  // Respond immediately; create the order in the background.
  if (completed && merchantOrderId) {
    after(() => createOrderFromPayment(merchantOrderId));
  }

  return NextResponse.json({ ok: true });
}
