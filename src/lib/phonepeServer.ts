import "server-only";
import crypto from "crypto";
import { PHONEPE_ENABLED, PHONEPE_ENV } from "@/lib/commerce/config";

// ============================================================================
// Server-side PhonePe Payment Gateway — Standard Checkout v2 (REST, no SDK).
//
// PhonePe is the temporary bridge gateway until Cashfree KYC clears
// ([[ojara-payment-gateway-plan]]). Unlike Razorpay's in-page widget, PhonePe is
// a REDIRECT flow:
//
//   1. initiatePhonePePayment()  -> our merchantOrderId + a redirectUrl; the
//      browser is sent to PhonePe to pay.
//   2. PhonePe redirects the shopper back to our return page AND fires a
//      server-to-server webhook.
//   3. verifyPhonePePayment()    -> read the Order Status API and confirm the
//      order is COMPLETED before any Wix order is created. This mirrors
//      razorpayServer.verifyPrepaidPayment so /api/checkout can treat either
//      provider the same way.
//
// The shopper's word is never trusted: a prepaid order is only ever built on a
// payment PhonePe itself reports COMPLETED, for the amount Wix priced.
//
// API shape pinned to the 2026 Standard Checkout v2 docs:
//   • token   POST {host}/v1/oauth/token            (form-encoded)
//   • pay     POST {host}/checkout/v2/pay           (Authorization: O-Bearer …)
//   • status  GET  {host}/checkout/v2/order/{id}/status
// Production token lives on identity-manager, NOT the pg path.
// ============================================================================

const HOSTS = {
  sandbox: {
    token: "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
    pay: "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay",
    status: (id: string) =>
      `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/${encodeURIComponent(id)}/status`,
  },
  production: {
    token: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
    pay: "https://api.phonepe.com/apis/pg/checkout/v2/pay",
    status: (id: string) =>
      `https://api.phonepe.com/apis/pg/checkout/v2/order/${encodeURIComponent(id)}/status`,
  },
} as const;

const hosts = () => HOSTS[PHONEPE_ENV];

// ---------------------------------------------------------------- OAuth token
// Cached across invocations on a warm instance. PhonePe rate-limits token
// minting, so we reuse the access_token until a minute before it expires rather
// than fetching one per payment.
let tokenCache: { token: string; expiresAt: number } | null = null;

const fetchAccessToken = async (): Promise<string> => {
  const nowSec = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.expiresAt - 60 > nowSec) return tokenCache.token;

  const body = new URLSearchParams({
    client_id: process.env.PHONEPE_CLIENT_ID!,
    client_version: process.env.PHONEPE_CLIENT_VERSION || "1",
    client_secret: process.env.PHONEPE_CLIENT_SECRET!,
    grant_type: "client_credentials",
  });

  const res = await fetch(hosts().token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_at?: number;
    message?: string;
    code?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      `PhonePe auth failed (${res.status}): ${data.message || data.code || "no access_token"}`,
    );
  }
  // expires_at is epoch seconds; fall back to a conservative 20 min if absent.
  const expiresAt = Number(data.expires_at) || nowSec + 1200;
  tokenCache = { token: data.access_token, expiresAt };
  return data.access_token;
};

// -------------------------------------------------------------------- Initiate
export type InitiateResult =
  | { ok: true; redirectUrl: string; merchantOrderId: string }
  | { ok: false; error: string };

/**
 * Create a PhonePe checkout and get the hosted-page redirect URL. `amountPaise`
 * is in paisa (₹10 = 1000); PhonePe's minimum is 100 (₹1). `metaInfo` (udf1..udf10)
 * rides along and is echoed back on status + webhook — a safe place to stash a
 * reference such as the Wix checkout id.
 */
export const initiatePhonePePayment = async (params: {
  merchantOrderId: string;
  amountPaise: number;
  redirectUrl: string;
  message?: string;
  metaInfo?: Record<string, string>;
}): Promise<InitiateResult> => {
  if (!PHONEPE_ENABLED) {
    return { ok: false, error: "Online payment isn't available right now." };
  }
  if (!/^[A-Za-z0-9_-]{1,63}$/.test(params.merchantOrderId)) {
    return { ok: false, error: "Invalid order reference." };
  }
  if (!Number.isFinite(params.amountPaise) || params.amountPaise < 100) {
    return { ok: false, error: "Invalid payment amount." };
  }

  try {
    const token = await fetchAccessToken();
    const res = await fetch(hosts().pay, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${token}`,
      },
      body: JSON.stringify({
        merchantOrderId: params.merchantOrderId,
        amount: Math.round(params.amountPaise),
        ...(params.metaInfo ? { metaInfo: params.metaInfo } : {}),
        paymentFlow: {
          type: "PG_CHECKOUT",
          ...(params.message ? { message: params.message } : {}),
          merchantUrls: { redirectUrl: params.redirectUrl },
        },
      }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      redirectUrl?: string;
      message?: string;
      code?: string;
    };
    if (!res.ok || !data.redirectUrl) {
      console.error("PhonePe initiate failed:", res.status, data);
      return { ok: false, error: data.message || data.code || "Could not start the payment." };
    }
    return { ok: true, redirectUrl: data.redirectUrl, merchantOrderId: params.merchantOrderId };
  } catch (e) {
    console.error("PhonePe initiate error:", e);
    return { ok: false, error: "Could not start the payment." };
  }
};

// ---------------------------------------------------------------------- Verify
// Deliberately the same shape as razorpayServer: /api/checkout branches on the
// provider but handles the result identically.
export type VerifiedPayment = {
  /** The merchantOrderId — our own reference, carried onto the Wix order. */
  id: string;
  /** Rupees actually paid. */
  amount: number;
  status: "COMPLETED";
};

export type PaymentCheck =
  | { ok: true; payment: VerifiedPayment }
  | { ok: false; status: number; error: string };

/**
 * Confirm a PhonePe order is genuinely COMPLETED, reading PhonePe's own record.
 * Amount is NOT checked here — the expected total is only known once Wix has
 * priced the checkout; see razorpayServer.paymentCoversTotal, reused verbatim.
 */
export const verifyPhonePePayment = async (
  merchantOrderId: string,
): Promise<PaymentCheck> => {
  if (!PHONEPE_ENABLED) {
    return { ok: false, status: 400, error: "Online payment isn't available right now." };
  }
  if (!/^[A-Za-z0-9_-]{1,63}$/.test(merchantOrderId)) {
    return { ok: false, status: 400, error: "Invalid payment reference." };
  }

  try {
    const token = await fetchAccessToken();
    const res = await fetch(hosts().status(merchantOrderId), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${token}`,
      },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      state?: string;
      amount?: number | string;
      code?: string;
      message?: string;
    };
    if (!res.ok) {
      console.error("PhonePe status lookup failed:", res.status, data);
      return { ok: false, status: 502, error: "Couldn't confirm your payment with PhonePe." };
    }
    if (data.state === "PENDING") {
      return { ok: false, status: 402, error: "Your payment is still being confirmed. Please wait a moment and try again." };
    }
    if (data.state !== "COMPLETED") {
      return { ok: false, status: 402, error: "This payment was not completed." };
    }
    // PhonePe returns amount in paisa (numeric in samples, String in the table).
    const amountRupees = Number(data.amount) / 100;
    if (!Number.isFinite(amountRupees) || amountRupees <= 0) {
      return { ok: false, status: 502, error: "Couldn't read the paid amount from PhonePe." };
    }
    return {
      ok: true,
      payment: { id: merchantOrderId, amount: amountRupees, status: "COMPLETED" },
    };
  } catch (e) {
    console.error("PhonePe status error:", e);
    return { ok: false, status: 502, error: "Couldn't confirm your payment with PhonePe." };
  }
};

// --------------------------------------------------------------- Webhook auth
/**
 * PhonePe (SHA auth type) signs the webhook with SHA256(username:password) and
 * puts the hex in the Authorization header. We recompute from the username +
 * password configured in the PhonePe dashboard (stored here as env vars) and
 * constant-time compare. The docs don't pin the exact casing/prefix, so we
 * tolerate an optional scheme prefix and compare case-insensitively on the hex.
 *
 * ⚠️ Verify against a real PhonePe webhook once live — if the format differs,
 * this is the single place to adjust.
 */
export const verifyPhonePeWebhookAuth = (authHeader: string | null): boolean => {
  const user = process.env.PHONEPE_WEBHOOK_USERNAME;
  const pass = process.env.PHONEPE_WEBHOOK_PASSWORD;
  if (!user || !pass || !authHeader) return false;

  const expected = crypto
    .createHash("sha256")
    .update(`${user}:${pass}`)
    .digest("hex")
    .toLowerCase();

  // Strip any leading scheme token ("SHA256 <hex>", "Basic <hex>", …) and lowercase.
  const received = authHeader.trim().split(/\s+/).pop()!.toLowerCase();

  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
