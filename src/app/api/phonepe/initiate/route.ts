import { NextResponse } from "next/server";
import { clientIp, isRateLimited, isSameOrigin } from "@/lib/apiGuard";
import { initiatePhonePePayment } from "@/lib/phonepeServer";
import { SITE_URL } from "@/lib/commerce/config";

// ============================================================================
// PhonePe: start a payment (Standard Checkout v2).
//
// The browser calls this instead of opening a Razorpay widget. We create a
// unique merchantOrderId, ask PhonePe for a hosted-checkout redirect URL, and
// hand both back. The browser then stashes the full /api/checkout payload under
// this merchantOrderId and sends the shopper to PhonePe. On return,
// /checkout/phonepe-return replays that payload to /api/checkout, which proves
// the payment via the Order Status API before any Wix order is created.
//
// The amount here is only what PhonePe charges; the authoritative amount check
// is /api/checkout §3b, which compares the captured amount against the
// Wix-priced total. Same trust model the Razorpay path has always used.
// ============================================================================

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (isRateLimited(`phonepe-initiate:${clientIp(req)}`, 10)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const amountRupees = Number(body?.amount);
    if (!Number.isFinite(amountRupees) || amountRupees <= 0) {
      return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
    }

    // Unique, ≤63 chars, [A-Za-z0-9_-] only.
    const merchantOrderId = `OJARA_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 12)}`
      .toUpperCase()
      .slice(0, 63);

    // Reference data echoed back on status + webhook (udf1..udf10, ≤256 each).
    const metaInfo: Record<string, string> = {};
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    if (email) metaInfo.udf1 = email.slice(0, 256);
    if (phone) metaInfo.udf2 = phone.slice(0, 256);

    const result = await initiatePhonePePayment({
      merchantOrderId,
      amountPaise: Math.round(amountRupees * 100),
      redirectUrl: `${SITE_URL}/checkout/phonepe-return?order=${encodeURIComponent(merchantOrderId)}`,
      message: "OJARA order payment",
      metaInfo: Object.keys(metaInfo).length ? metaInfo : undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({
      redirectUrl: result.redirectUrl,
      merchantOrderId: result.merchantOrderId,
    });
  } catch (err) {
    console.error("PhonePe initiate route failed:", err);
    return NextResponse.json(
      { error: "Could not start the payment." },
      { status: 500 },
    );
  }
}
