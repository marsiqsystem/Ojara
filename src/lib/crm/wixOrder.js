// Extracts { orderId, name, phone, address, items, amount, paymentMode } from a
// Wix webhook body. Pure functions, no I/O. Defensive across Wix's payload shapes.

function normalizePhone(raw, defaultCountryCode = "91") {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Domestic format: a single leading 0 before a 10-digit number (e.g. 08123456789).
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `${defaultCountryCode}${digits}`;
  if (digits.length > 11 && digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

const firstDefined = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== "");

function deepFind(obj, predicate, maxDepth = 6) {
  const seen = new Set();
  const walk = (node, depth) => {
    if (node == null || typeof node !== "object" || depth > maxDepth || seen.has(node)) return undefined;
    seen.add(node);
    const hit = predicate(node);
    if (hit !== undefined) return hit;
    for (const key of Object.keys(node)) {
      const r = walk(node[key], depth + 1);
      if (r !== undefined) return r;
    }
    return undefined;
  };
  return walk(obj, 0);
}

function moneyValue(m) {
  if (m == null) return undefined;
  if (typeof m === "object") return firstDefined(m.value, m.amount, m.formattedAmount);
  return m;
}

function customFieldValue(source = {}, titleIncludes) {
  const list = source.customFields || source.customField;
  const want = String(titleIncludes).toLowerCase();
  if (Array.isArray(list)) {
    const hit = list.find((f) => String(f?.title || f?.name || "").toLowerCase().includes(want));
    return hit ? firstDefined(hit.value, hit.translatedValue) : undefined;
  }
  if (list && typeof list === "object") {
    for (const [k, v] of Object.entries(list)) {
      if (String(k).toLowerCase().includes(want)) {
        return typeof v === "object" ? firstDefined(v.value, v.translatedValue) : v;
      }
    }
  }
  return undefined;
}

const deepFindAmount = (root) =>
  deepFind(root, (n) => {
    const t = n.priceSummary?.total ?? (n.total && typeof n.total === "object" ? n.total : undefined);
    return t ? moneyValue(t) : undefined;
  });

const deepFindItems = (root) =>
  deepFind(root, (n) => {
    if (Array.isArray(n.lineItems) && n.lineItems.length) return n.lineItems;
    if (Array.isArray(n.items) && n.items.length) return n.items;
    return undefined;
  });

function normalizePaymentMode(order = {}, body = {}) {
  const cf = firstDefined(
    customFieldValue(order, "payment method"),
    customFieldValue(body, "payment method")
  );
  const note = String(firstDefined(order.buyerNote, body.buyerNote, order.buyer_note, "") || "");
  const definitive = `${cf || ""} ${note}`.toUpperCase();
  if (definitive.includes("PREPAID") || definitive.includes("RAZORPAY") || definitive.includes("ONLINE"))
    return "PREPAID";
  if (definitive.includes("COD") || definitive.includes("CASH")) return "COD";

  const explicit = firstDefined(
    body.paymentMode,
    order.paymentMode,
    order.paymentMethod,
    deepFind(body, (n) => firstDefined(n.paymentMode, n.paymentMethod))
  );
  if (explicit) {
    const s = String(explicit).toUpperCase();
    if (s.includes("PREPAID") || s.includes("ONLINE") || s.includes("CARD") || s.includes("RAZORPAY"))
      return "PREPAID";
    if (s.includes("COD") || s.includes("CASH")) return "COD";
  }

  const status = String(
    firstDefined(
      order.paymentStatus,
      order.billingInfo?.paymentStatus,
      body.paymentStatus,
      deepFind(body, (n) => (typeof n.paymentStatus === "string" ? n.paymentStatus : undefined))
    ) || ""
  ).toUpperCase();
  return status === "PAID" || status === "FULLY_PAID" ? "PREPAID" : "COD";
}

function extractAmount(order = {}, body = {}) {
  const raw = firstDefined(
    moneyValue(order.priceSummary?.total),
    moneyValue(order.totals?.total),
    moneyValue(order.balanceSummary?.balance),
    moneyValue(order.total),
    body.amount,
    body.total,
    deepFindAmount(body)
  );
  if (raw == null) return undefined;
  const cleaned = String(raw).replace(/[^\d.]/g, "");
  return cleaned || undefined;
}

function extractItems(order = {}, body = {}) {
  const rawAll = order.lineItems || order.items || body.lineItems || deepFindItems(body) || [];
  if (!Array.isArray(rawAll)) return [];
  return rawAll.map((li) => ({
    name:
      li?.itemName ||
      li?.productName?.original ||
      li?.productName?.translated ||
      li?.productName ||
      li?.name ||
      li?.catalogReference?.productName ||
      li?.title ||
      "Item",
    sku:
      li?.sku ||
      li?.physicalProperties?.sku ||
      li?.catalogReference?.options?.sku ||
      undefined,
    quantity: Number(li?.quantity) || 1,
    price: moneyValue(li?.totalPrice) || moneyValue(li?.price) || undefined,
  }));
}

function extractAddress(order = {}, body = {}) {
  const a =
    order.shippingInfo?.logistics?.shippingDestination?.address ||
    order.shippingInfo?.shippingDestination?.address ||
    order.recipientInfo?.address ||
    order.billingInfo?.address ||
    body.address ||
    {};
  const line1 = firstDefined(
    a.addressLine1,
    a.addressLine,
    a.addressLine1WithComment,
    [a.streetAddress?.number, a.streetAddress?.name].filter(Boolean).join(" ") || undefined,
    a.formattedAddress
  );
  return {
    line1: line1 || "",
    line2: firstDefined(a.addressLine2, a.subdivision2) || "",
    city: firstDefined(a.city, a.cityName) || "",
    // Wix uses ISO codes like "IN-DL"; strip the country prefix.
    state: String(firstDefined(a.subdivisionFullname, a.subdivision, a.state) || "").replace(/^IN-/i, ""),
    postalCode: firstDefined(a.postalCode, a.zipCode, a.zip) || "",
    country: firstDefined(a.countryFullname, a.country) || "India",
  };
}

function extractOrderInfo(body, defaultCountryCode = "91") {
  const b = body || {};
  const order = b.order || b.data?.order || b.entity || b.data || b;
  const contact = b.contact || b.data?.contact || order.buyerInfo || {};

  const orderId = firstDefined(
    order.number, order.orderNumber, order._id, order.id, b.orderId, b.orderNumber
  );

  const rawPhone = firstDefined(
    order.buyerInfo?.phone,
    order.billingInfo?.contactDetails?.phone,
    order.billingInfo?.address?.phone,
    order.recipientInfo?.contactDetails?.phone,
    order.shippingInfo?.logistics?.shippingDestination?.contactDetails?.phone,
    order.shippingInfo?.shippingDestination?.contactDetails?.phone,
    contact.phone,
    contact.phones?.[0]?.phone,
    b.phone
  );

  const customerName = firstDefined(
    [order.billingInfo?.contactDetails?.firstName, order.billingInfo?.contactDetails?.lastName]
      .filter(Boolean).join(" ") || undefined,
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") || undefined,
    contact.name, b.customerName, "Customer"
  );

  const items = extractItems(order, b);
  const first = items[0] || {};
  const product = items.length
    ? (items.length > 1 ? `${first.name} (+${items.length - 1} more)` : first.name)
    : firstDefined(b.product, b.productName);

  const paymentMode = normalizePaymentMode(order, b);

  return {
    orderId: orderId != null ? String(orderId) : undefined,
    orderGuid: firstDefined(order._id, order.id) || undefined,
    phone: normalizePhone(rawPhone, defaultCountryCode),
    customerName,
    email: firstDefined(order.buyerEmail, contact.email, order.billingInfo?.contactDetails?.email) || undefined,
    amount: extractAmount(order, b),
    paymentMode,
    product,
    sku: first.sku,
    items,
    address: extractAddress(order, b),
  };
}

export { extractOrderInfo, extractItems, extractAddress, normalizePhone };
