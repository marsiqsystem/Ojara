// Wix "Order placed" -> create the order in Velocity (create-only, NOT shipped).
//
// Point a Wix Automation ("Send via webhook") at:  https://<ojara-site>/api/wix-webhook
// The order lands in Velocity "New Orders" — operator compares rates & ships manually.

import { NextRequest, NextResponse } from "next/server";
import { extractOrderInfo } from "@/lib/crm/wixOrder";
import * as velocity from "@/lib/crm/velocity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Optional shared-secret check: set WIX_WEBHOOK_SECRET and send it as a header
  // from the Wix Automation (x-wix-secret). Skip if you don't configure one.
  const expected = process.env.WIX_WEBHOOK_SECRET;
  if (expected && req.headers.get("x-wix-secret") !== expected) {
    return new NextResponse(null, { status: 401 });
  }

  let body: unknown = {};
  try { body = await req.json(); } catch { /* empty */ }

  // ?debug=<CRON_SECRET> returns a JSON trace instead of a silent 200 (for testing).
  const debug =
    !!process.env.CRON_SECRET &&
    req.nextUrl.searchParams.get("debug") === process.env.CRON_SECRET;
  const trace: Record<string, unknown> = {};

  try {
    const info = extractOrderInfo(body, process.env.DEFAULT_COUNTRY_CODE || "91");
    trace.extracted = {
      orderId: info.orderId, name: info.customerName, phone: info.phone || null,
      amount: info.amount || null, paymentMode: info.paymentMode, product: info.product || null,
    };

    if (!info.orderId) {
      trace.skipped = "no order id";
      // Log the raw body so you can map an unexpected Wix shape.
      console.warn("[wix-webhook] no order id — RAW body:\n" + JSON.stringify(body, null, 2));
      return debug ? NextResponse.json({ ok: false, trace }) : new NextResponse(null, { status: 200 });
    }

    const order = {
      orderId: info.orderId,
      orderGuid: info.orderGuid,
      name: info.customerName,
      phone: info.phone,
      email: info.email,
      product: info.product,
      sku: info.sku,
      items: info.items,
      amount: info.amount,
      paymentMode: info.paymentMode,
      address: info.address,
    };

    const created = await velocity.createOrderOnly(order);
    trace.velocity = {
      ok: !!created.ok, dryRun: !!created.dryRun,
      velocityOrderId: created.velocityOrderId || null,
      error: created.ok ? undefined : created.error,
    };
    if (created.ok) {
      console.log(`[wix-webhook] Velocity order created (create-only): ${created.velocityOrderId}`);
    } else {
      console.error("[wix-webhook] Velocity create-order failed:", created.error);
    }
  } catch (err) {
    console.error("[wix-webhook] error:", err);
    trace.error = err instanceof Error ? err.message : String(err);
  }

  // Always 200 so Wix doesn't retry-storm. Velocity failures are logged, not re-thrown.
  return debug ? NextResponse.json({ ok: true, trace }) : new NextResponse(null, { status: 200 });
}
