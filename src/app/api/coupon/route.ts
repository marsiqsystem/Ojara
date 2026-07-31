import { NextResponse } from "next/server";
import { WIX_ADMIN_ENABLED } from "@/lib/commerce/config";
import { wixAdminClientServer } from "@/lib/wixAdminClientServer";

// ============================================================================
// Live coupon validation — asks Wix's own engine what a code is worth on THIS
// cart, so the storefront no longer has to hardcode every coupon.
//
// It uses the eCom Totals Calculator (a read-only price estimate): we hand it the
// cart line items + the code, Wix applies the coupon exactly as it would at
// checkout, and hands back the real ₹ discount — faithful to any coupon type,
// minimum, expiry, or per-customer limit.
//
// FAIL-SAFE CONTRACT: this route NEVER throws to the client. On a missing admin
// key, a bad response, or any Wix error it returns { ok: false }, and the caller
// falls back to the local COUPON_TIERS mirror in lib/commerce/pricing.ts — i.e.
// exactly the pre-existing behaviour. So a wrong/blind Wix call can only fail to
// ACTIVATE the feature; it can never break checkout.
//
//   ok: false          → Wix couldn't answer; use the mirror.
//   ok: true, valid     → Wix applied the code; `discount` is authoritative (₹).
//   ok: true, !valid    → Wix definitively rejected the code (unknown/expired/
//                         minimum not met); reject it even if the mirror knows it.
// ============================================================================

const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

type IncomingLine = {
  id?: string;
  name?: string;
  price?: number | string;
  quantity?: number;
  wixCatalogItemId?: string;
};

const toNumber = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

export async function POST(req: Request) {
  // No admin key → we can't ask Wix. Tell the client to use the mirror.
  if (!WIX_ADMIN_ENABLED) {
    return NextResponse.json({ ok: false, reason: "wix-disabled" });
  }

  let body: { code?: string; lines?: IncomingLine[]; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-json" });
  }

  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const lines = Array.isArray(body?.lines) ? body.lines : [];
  const email =
    typeof body?.email === "string" && body.email.trim() ? body.email.trim() : undefined;

  if (!code || lines.length === 0) {
    return NextResponse.json({ ok: true, valid: false, reason: "empty" });
  }

  // Map the storefront cart into Totals Calculator line items. Products carry a
  // Wix catalog id (needed so product-scoped coupons match); anything without one
  // still counts toward an order-level coupon as a custom line item.
  const lineItems = lines
    .filter((l) => toNumber(l.price) > 0 && (l.quantity ?? 0) > 0)
    .map((l, i) => ({
      _id: l.id || `line-${i}`,
      quantity: Math.max(1, Math.floor(l.quantity ?? 1)),
      price: String(toNumber(l.price)),
      productName: l.name || undefined,
      ...(l.wixCatalogItemId
        ? {
            catalogReference: {
              appId: WIX_STORES_APP_ID,
              catalogItemId: l.wixCatalogItemId,
            },
          }
        : {}),
    }));

  if (lineItems.length === 0) {
    return NextResponse.json({ ok: true, valid: false, reason: "no-priced-lines" });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = wixAdminClientServer() as any;
    const result = await admin.totalsCalculator.calculateTotals({
      couponCode: code,
      lineItems,
      ...(email ? { buyerEmail: email } : {}),
    });

    // The applied-discounts array is the ground truth: a coupon entry means Wix
    // accepted the code. Read the coupon's own amount so we don't accidentally
    // fold in any automatic discount-rule savings.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applied: any[] = Array.isArray(result?.appliedDiscounts)
      ? result.appliedDiscounts
      : [];
    const couponHit = applied.find(
      (d) =>
        d?.coupon &&
        (!d.coupon.code ||
          String(d.coupon.code).toUpperCase() === code.toUpperCase()),
    );

    if (!couponHit) {
      return NextResponse.json({ ok: true, valid: false, reason: "rejected" });
    }

    const discount = Math.max(0, Math.round(toNumber(couponHit.coupon?.amount?.amount)));
    if (discount <= 0) {
      // A ₹0 coupon (e.g. free-shipping, which the storefront can't model) is not
      // something we can safely price client-side — treat as not applicable here.
      return NextResponse.json({ ok: true, valid: false, reason: "zero-value" });
    }

    return NextResponse.json({
      ok: true,
      valid: true,
      discount,
      name: couponHit.coupon?.name || undefined,
    });
  } catch {
    // Any Wix failure → let the client fall back to the mirror. Never surface an
    // error that would block the shopper from applying a known code.
    return NextResponse.json({ ok: false, reason: "wix-error" });
  }
}
