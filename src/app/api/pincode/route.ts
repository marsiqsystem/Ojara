import { NextRequest, NextResponse } from "next/server";
import { stateCodeFromName } from "@/lib/commerce/indiaStates";

// GET /api/pincode?pin=110001 -> { ok, city, state (our IN-XX code), stateName }
//
// Looks the pincode up with India Post so checkout can fill in city + state and
// show a delivery date the moment a shopper types six digits. Read-only and
// cached; any failure returns ok:false and the shopper just types their city.

export async function GET(req: NextRequest) {
  const pin = (req.nextUrl.searchParams.get("pin") || "").trim();
  if (!/^[1-9]\d{5}$/.test(pin)) {
    return NextResponse.json({ ok: false, error: "Invalid pincode" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    const data = await res.json();
    type PostOffice = { District?: string; Block?: string; State?: string; DeliveryStatus?: string };
    const offices: PostOffice[] =
      data?.[0]?.Status === "Success" ? data[0].PostOffice || [] : [];
    if (offices.length === 0) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const office = offices.find((o) => o.DeliveryStatus === "Delivery") || offices[0];
    const stateName = String(office.State || "");
    return NextResponse.json(
      {
        ok: true,
        city: String(office.District || office.Block || ""),
        stateName,
        state: stateCodeFromName(stateName),
      },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  } catch (err) {
    console.warn("[pincode] lookup failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
