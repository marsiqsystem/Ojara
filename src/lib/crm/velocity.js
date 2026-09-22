// Single place that talks to the Velocity shipping API for Ojara.
//
// createOrderOnly(o)  -> creates the order in Velocity "New Orders" WITHOUT a
//                        courier/AWB and WITHOUT charging the wallet. THIS is what
//                        the Wix webhook calls. Operator compares rates + ships
//                        manually in the Velocity panel.
// createShipment(o)   -> creates AND books a courier + AWB (DEDUCTS WALLET).
//                        NOT wired to the webhook — here for future use only.
// checkRate(...)      -> read-only freight quotes. Optional/future.
//
// Auth: prefers VELOCITY_API_TOKEN (dashboard key, sent verbatim in a BARE
// Authorization header). If no token is set, falls back to VELOCITY_USERNAME
// (registered mobile) + VELOCITY_PASSWORD via /auth-token (short-lived token,
// cached, refreshed on 401). Velocity disables user/pass ~2026-09-30 — prefer a key.
// Set VELOCITY_TOKEN_SCHEME=bearer only if a bare token 401s.
//
// Safety gates:
//   VELOCITY_MOCK=true     -> never call the network; return a fake result.
//   VELOCITY_ENABLED=false -> treat as dry-run (no network).

import { PACKAGE_BOX, parcelWeightKg, parcelHeightCm } from "./packageBox";

function cfg() {
  return {
    baseUrl: (process.env.VELOCITY_BASE_URL || "https://shazam.velocity.in").replace(/\/$/, ""),
    apiToken: (process.env.VELOCITY_API_TOKEN || "").trim(),
    tokenScheme: (process.env.VELOCITY_TOKEN_SCHEME || "").trim().toLowerCase(),
    // LEGACY auth fallback (used ONLY when no VELOCITY_API_TOKEN is set). The
    // account's registered mobile number + password. Velocity disables this
    // ~2026-09-30 — prefer generating a dashboard key.
    username: (process.env.VELOCITY_USERNAME || "").trim(),
    password: (process.env.VELOCITY_PASSWORD || "").trim(),
    warehouseId: (process.env.VELOCITY_WAREHOUSE_ID || "").trim(),
    pickupLocation: (process.env.VELOCITY_PICKUP_LOCATION || "").trim(),
    orderPrefix: (process.env.VELOCITY_ORDER_PREFIX || "OJ-#").trim(), // Ojara's id prefix
    dims: { ...PACKAGE_BOX },
    enabled: String(process.env.VELOCITY_ENABLED).trim().toLowerCase() === "true",
    mock: String(process.env.VELOCITY_MOCK).trim().toLowerCase() === "true",
  };
}

// --- AUTH -----------------------------------------------------------------
// Priority: (1) VELOCITY_API_TOKEN used verbatim, no network call — the long-term
// path; (2) else VELOCITY_USERNAME (registered mobile) + VELOCITY_PASSWORD POSTed
// to /auth-token for a short-lived token (cached in-module, refreshed on expiry or
// a 401). Either token goes in a BARE Authorization header (Bearer only if
// VELOCITY_TOKEN_SCHEME=bearer).
let tokenCache = null; // { token, expiresAt }

function hasAuth(c) { return !!(c.apiToken || (c.username && c.password)); }

async function getToken(forceRefresh = false) {
  const c = cfg();
  if (c.apiToken) {
    return c.tokenScheme === "bearer" ? `Bearer ${c.apiToken}` : c.apiToken;
  }
  if (!forceRefresh && tokenCache && tokenCache.expiresAt - 60000 > Date.now()) {
    return tokenCache.token;
  }
  const res = await fetch(`${c.baseUrl}/custom/api/v1/auth-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: c.username, password: c.password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new Error(`velocity auth failed HTTP ${res.status}`);
  const exp = data.expires_at ? new Date(data.expires_at).getTime() : NaN;
  tokenCache = { token: data.token, expiresAt: Number.isFinite(exp) && exp > Date.now() ? exp : Date.now() + 30 * 60000 };
  return data.token;
}

/** Format a date as "YYYY-MM-DD HH:mm" in IST, regardless of server timezone. */
function formatOrderDate(d) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

/** Map OUR normalized order -> Velocity's forward-order body. */
function buildShipmentPayload(o) {
  const c = cfg();
  const address = o.address || {};
  const isCOD = o.paymentMode !== "PREPAID";
  const amount = Number(o.amount) || 0;

  const productItems = Array.isArray(o.items) ? o.items : [];
  const items = productItems.length
    ? productItems.map((it) => ({
        name: it.name || o.product || "Item",
        sku: it.sku || "",
        units: Number(it.quantity) || 1,
        selling_price:
          it.price != null && it.price !== "" ? Number(it.price) || 0 : amount,
      }))
    : [{ name: o.product || "Item", sku: o.sku || "", units: 1, selling_price: amount }];

  const totalUnits = items.reduce((s, it) => s + (Number(it.units) || 1), 0) || 1;

  return {
    // Ojara's own id prefix so the Velocity dashboard id matches the Wix order.
    order_id: o.orderId ? `${c.orderPrefix}${o.orderId}` : o.orderGuid,
    order_date: formatOrderDate(new Date()),
    billing_customer_name: o.name || "Customer",
    billing_address: [address.line1, address.line2, address.line3].filter(Boolean).join(", ") || "",
    billing_city: address.city || "",
    billing_pincode: address.postalCode || "",
    billing_state: address.state || "",
    billing_country: address.country || "India",
    billing_phone: o.phone || "",
    payment_method: isCOD ? "COD" : "PREPAID",
    print_label: true,
    pickup_location: c.pickupLocation || "", // REQUIRED: warehouse display name
    sub_total: amount,
    cod_collectible: isCOD ? amount : 0,
    length: c.dims.length,
    breadth: c.dims.breadth,
    height: parcelHeightCm(totalUnits),
    weight: parcelWeightKg(totalUnits),
    warehouse_id: c.warehouseId,
    order_items: items,
  };
}

/**
 * CREATE-ONLY — create a Velocity order WITHOUT a courier/AWB and WITHOUT charging
 * the wallet. Lands in Velocity "New Orders" (response: status:1, order_created:1,
 * awb_generated:0). Never throws. THIS is what the Wix webhook calls.
 */
async function createOrderOnly(o) {
  const c = cfg();
  const body = buildShipmentPayload(o);

  if (c.mock || !c.enabled) {
    console.log("[velocity] MOCK createOrderOnly — no network. Would POST /forward-order:", JSON.stringify(body, null, 2));
    return { ok: true, dryRun: true, velocityOrderId: `MOCK-ORD-${o.orderId}`, raw: { mock: true } };
  }
  if (!hasAuth(c) || !c.warehouseId) {
    console.error("[velocity] not configured — need VELOCITY_WAREHOUSE_ID and either VELOCITY_API_TOKEN or VELOCITY_USERNAME/VELOCITY_PASSWORD.");
    return { ok: false, error: "velocity not configured" };
  }

  try {
    // NOTE: /forward-order = create-only. Do NOT change this to
    // /forward-order-orchestration (that one books a courier AND charges the wallet).
    const call = (token) =>
      fetch(`${c.baseUrl}/custom/api/v1/forward-order`, {
        method: "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    let token = await getToken();
    let res = await call(token);
    if (res.status === 401) { tokenCache = null; token = await getToken(true); res = await call(token); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[velocity] create-order HTTP ${res.status}:`, JSON.stringify(data).slice(0, 400));
      return { ok: false, error: data?.message || `HTTP ${res.status}`, raw: data };
    }
    if (data?.status !== 1 || !data?.payload?.order_created) {
      console.error("[velocity] create-order non-success:", JSON.stringify(data).slice(0, 400));
      return { ok: false, error: data?.message || `velocity status=${data?.status}`, raw: data };
    }
    return {
      ok: true,
      velocityOrderId: data.payload.order_id || null,
      shipmentId: data.payload.shipment_id || null,
      raw: data,
    };
  } catch (err) {
    console.error("[velocity] createOrderOnly failed:", err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * OPTIONAL / FUTURE — create AND book a courier + AWB. DEDUCTS THE WALLET.
 * NOT called by the Wix webhook. Only use this if Ojara later wants auto-ship.
 */
async function createShipment(o) {
  const c = cfg();
  const body = buildShipmentPayload(o);
  if (c.mock || !c.enabled) {
    const awb = `MOCK-${o.orderId}`;
    return { ok: true, dryRun: true, awb, raw: { mock: true } };
  }
  if (!hasAuth(c) || !c.warehouseId) return { ok: false, error: "velocity not configured" };
  try {
    const call = (token) =>
      fetch(`${c.baseUrl}/custom/api/v1/forward-order-orchestration`, {
        method: "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    let token = await getToken();
    let res = await call(token);
    if (res.status === 401) { tokenCache = null; token = await getToken(true); res = await call(token); }
    const data = await res.json().catch(() => ({}));
    const awb = data?.payload?.awb_code;
    if (!res.ok || data?.status !== 1 || !awb) {
      return { ok: false, error: data?.message || `velocity status=${data?.status}`, raw: data };
    }
    return { ok: true, awb, raw: data };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

export { createOrderOnly, createShipment, buildShipmentPayload };
