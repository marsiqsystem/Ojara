import { NextResponse } from "next/server";
import { WIX_ADMIN_ENABLED } from "@/lib/commerce/config";
import { wixAdminClientServer } from "@/lib/wixAdminClientServer";

// ============================================================================
// Automatic offers — asks Wix which of its automatic discount RULES (bracelet +
// ring 10%, buy 2 get 1) this cart earns, and what they're worth.
//
// Wix applies those rules to the order by itself, with no code. Without asking,
// the bag would quote a higher total than Wix then charges — and a prepaid
// payment would no longer match the order. Same read-only Totals Calculator and
// the same fail-safe contract as /api/coupon:
//
//   ok: false  → Wix couldn't answer; the client falls back to estimateOffers.
//   ok: true   → `discounts` is Wix's own answer (empty = none apply).
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
  if (!WIX_ADMIN_ENABLED) {
    return NextResponse.json({ ok: false, reason: "wix-disabled" });
  }

  let body: { lines?: IncomingLine[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-json" });
  }

  const lines = Array.isArray(body?.lines) ? body.lines.slice(0, 50) : [];
  // Rules only match real catalog items, so lines without a Wix id can't earn one.
  const lineItems = lines
    .filter((l) => l.wixCatalogItemId && toNumber(l.price) > 0 && (l.quantity ?? 0) > 0)
    .map((l, i) => ({
      _id: l.id || `line-${i}`,
      quantity: Math.min(99, Math.max(1, Math.floor(l.quantity ?? 1))),
      price: String(toNumber(l.price)),
      productName: l.name || undefined,
      catalogReference: {
        appId: WIX_STORES_APP_ID,
        catalogItemId: l.wixCatalogItemId!,
      },
    }));

  if (lineItems.length === 0) {
    return NextResponse.json({ ok: true, discounts: [] });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = wixAdminClientServer() as any;
    const result = await admin.totalsCalculator.calculateTotals({ lineItems });

    // Wix returns one entry per rule per line — fold them into one per rule.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applied: any[] = Array.isArray(result?.appliedDiscounts)
      ? result.appliedDiscounts
      : [];
    const byRule = new Map<string, number>();
    for (const d of applied) {
      const rule = d?.discountRule;
      if (!rule) continue;
      const name = String(rule?.name?.translated || rule?.name?.original || "Offer").trim();
      byRule.set(name, (byRule.get(name) ?? 0) + toNumber(rule?.amount?.amount));
    }

    const discounts = [...byRule]
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
      .filter((d) => d.amount > 0);

    return NextResponse.json({ ok: true, discounts });
  } catch {
    return NextResponse.json({ ok: false, reason: "wix-error" });
  }
}
