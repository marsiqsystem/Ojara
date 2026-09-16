import { NextRequest, NextResponse } from "next/server";
import { razorpayServer } from "@/lib/razorpayServer";

// Create the Razorpay payment order server-side so KEY_SECRET never reaches the
// browser. Returns the public key_id + order details for the checkout widget.
// (Bundle §7)
export async function POST(req: NextRequest) {
  try {
    const { amount, currency = "INR", receipt, notes } = (await req.json()) || {};

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const instance = razorpayServer();
    if (!instance) {
      return NextResponse.json(
        { error: "Razorpay credentials not configured" },
        { status: 500 },
      );
    }

    const order = await instance.orders.create({
      amount: Math.round(numericAmount * 100), // Razorpay works in paise
      currency,
      receipt: receipt || `order_${Date.now()}`,
      notes: notes || {},
    });

    // key_id is public and safe to return. key_secret NEVER leaves the server.
    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err: unknown) {
    console.error("Razorpay create order failed:", err);
    const message = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
