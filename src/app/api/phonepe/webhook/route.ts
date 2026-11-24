import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { verifyPhonePeWebhookAuth } from "@/lib/phonepeServer";
import { BRAND_NAME, SUPPORT_EMAIL } from "@/lib/commerce/config";

// ============================================================================
// PhonePe server-to-server webhook — the SAFETY NET.
//
// The happy path creates the Wix order on the browser's return from PhonePe
// (/checkout/phonepe-return → /api/checkout). But if the shopper closes the tab
// right after paying, that return never runs — money taken, no order. PhonePe
// also fires this webhook for every completed/failed payment, so here we catch
// that case and email the owner to reconcile, since orders are shipped manually
// from Wix / Velocity anyway.
//
// Auth: PhonePe signs with SHA256(username:password) (the pair configured in the
// PhonePe dashboard + stored as PHONEPE_WEBHOOK_USERNAME/PASSWORD). We recompute
// and constant-time compare before trusting anything in the body.
//
// Always answer 2xx fast (PhonePe expects a reply within 3–5s) and treat
// delivery as at-least-once: duplicates are fine, this only sends a heads-up.
// ============================================================================

const sendOwnerAlert = async (subject: string, text: string): Promise<void> => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailAppPassword) {
    console.error("PhonePe owner alert skipped: GMAIL creds missing.");
    return;
  }
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
    console.error("PhonePe owner alert email failed:", e);
  }
};

export async function POST(req: Request) {
  // 1. Authenticate the caller BEFORE reading the body as truth.
  if (!verifyPhonePeWebhookAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // PhonePe may add fields over time; a parse failure shouldn't 500 the hook.
    return NextResponse.json({ ok: true });
  }

  const event: string = body?.event || "";
  const p = body?.payload || {};
  const merchantOrderId = p?.merchantOrderId || p?.orderId || "unknown";
  const amountRupees =
    typeof p?.amount === "number" ? (p.amount / 100).toFixed(2) : "unknown";

  // Rely only on payload.state for the outcome (per PhonePe guidance).
  if (event === "checkout.order.completed" || p?.state === "COMPLETED") {
    console.log("PhonePe webhook: COMPLETED", merchantOrderId, amountRupees);
    // Heads-up only — the order is normally already created on the browser
    // return. The owner cross-checks against the Wix/PhonePe dashboards.
    await sendOwnerAlert(
      `PhonePe payment received — ${merchantOrderId}`,
      `A PhonePe payment COMPLETED.\n\n` +
        `Merchant Order ID: ${merchantOrderId}\n` +
        `Amount: ₹${amountRupees}\n\n` +
        `The order should already be in Wix (created when the customer returned ` +
        `from PhonePe). If you do NOT see a matching order, the customer paid but ` +
        `their order didn't finish — confirm in the PhonePe Business dashboard and ` +
        `create/ship the order manually or refund them.\n`,
    );
  } else if (event === "checkout.order.failed" || p?.state === "FAILED") {
    console.log("PhonePe webhook: FAILED", merchantOrderId);
  } else {
    console.log("PhonePe webhook:", event, merchantOrderId, p?.state);
  }

  return NextResponse.json({ ok: true });
}
