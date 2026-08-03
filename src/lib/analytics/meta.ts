// Server-side Meta Conversions API sender.
//
// Extracted out of app/api/capi/route.ts so TWO callers can share one
// implementation (and one set of hashing/normalisation rules):
//
//   • /api/capi          — every browser-originated event, forwarded from
//                          lib/analytics/capi.ts.
//   • /api/checkout      — the Purchase event, sent directly from the server the
//                          moment the order is created. Ad blockers and closed
//                          tabs kill the browser Purchase; this one always
//                          lands. Both carry event_id `purchase-<orderId>` so
//                          Meta collapses them into ONE conversion.
//
// Everything here is best-effort: a Meta failure must never fail an order.

import crypto from "crypto";

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE;
const API_VERSION = "v21.0";

/** True when the CAPI keys are present; callers can skip work when false. */
export const CAPI_ENABLED = Boolean(PIXEL_ID && ACCESS_TOKEN);

// Meta wants user identifiers SHA-256 hashed, lower-cased and trimmed first.
const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

const hashed = (value?: string) =>
  value && value.trim() ? [sha256(value)] : undefined;

/**
 * Meta matches phone numbers in E.164 WITHOUT the `+`, so a bare Indian
 * 10-digit mobile matches nothing until it carries the `91` country code.
 * Accepts anything the checkout form might hold ("+91 98765 43210",
 * "098765 43210", "9876543210") and returns "919876543210".
 */
export const normalizePhone = (raw?: string): string | undefined => {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.length === 10) return `91${digits}`;
  // Local trunk prefix: 0 + 10 digits.
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits; // already country-coded (or not an Indian number)
};

/**
 * Wix stores states as ISO 3166-2 codes ("IN-MH"). Meta wants the bare
 * subdivision, lower-cased.
 */
const normalizeState = (raw?: string): string | undefined => {
  const v = (raw || "").trim();
  if (!v) return undefined;
  return v.replace(/^[A-Za-z]{2}-/, "").toLowerCase();
};

export type MetaUserData = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  /** ISO-3166 alpha-2. Defaults to "in" when an address is present. */
  country?: string;
  /**
   * Stable per-browser pseudonymous id (see lib/analytics/identity.ts). The
   * single biggest Event Match Quality lever for a store where most visitors
   * never type an email.
   */
  externalId?: string;
  fbp?: string;
  fbc?: string;
  clientIp?: string;
  userAgent?: string;
};

export type MetaEvent = {
  eventName: string;
  eventId?: string;
  eventSourceUrl?: string;
  actionSource?: string;
  userData?: MetaUserData;
  /** Non-PII: value, currency, content_ids, contents, num_items… */
  customData?: Record<string, unknown>;
};

const buildUserData = (u: MetaUserData = {}) => {
  const hasAddress = Boolean(u.city || u.state || u.zip);
  return {
    em: hashed(u.email),
    ph: hashed(normalizePhone(u.phone)),
    fn: hashed(u.firstName),
    ln: hashed(u.lastName),
    ct: hashed(u.city?.replace(/\s+/g, "")),
    st: hashed(normalizeState(u.state)),
    zp: hashed(u.zip?.replace(/\s+/g, "")),
    country: hashed(u.country || (hasAddress ? "in" : undefined)),
    external_id: hashed(u.externalId),
    client_ip_address: u.clientIp,
    client_user_agent: u.userAgent,
    fbp: u.fbp,
    fbc: u.fbc,
  };
};

/**
 * POST one event to Meta. Resolves to a result object rather than throwing, so
 * callers can stay fire-and-forget. A no-op (skipped) when keys are absent.
 */
export async function sendMetaEvent(
  event: MetaEvent,
): Promise<{ ok: boolean; skipped?: boolean; error?: unknown; data?: unknown }> {
  if (!CAPI_ENABLED) return { ok: false, skipped: true };
  if (!event.eventName) return { ok: false, error: "eventName is required" };

  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        event_source_url: event.eventSourceUrl,
        action_source: event.actionSource || "website",
        user_data: buildUserData(event.userData),
        custom_data: event.customData || {},
      },
    ],
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Meta CAPI rejected event:", event.eventName, data);
      return { ok: false, error: data };
    }
    return { ok: true, data };
  } catch (err) {
    console.error("Meta CAPI request failed:", err);
    return { ok: false, error: "request_failed" };
  }
}

/** Pull the IP + UA Meta wants off an incoming request. */
export const requestContext = (req: Request) => ({
  clientIp:
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined,
  userAgent: req.headers.get("user-agent") || undefined,
});
