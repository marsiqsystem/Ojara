import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/catalog";

// The checkout upsell runs inside a client component, so it can't call
// getAllProducts() directly. Mirrors /api/categories.
export async function GET() {
  try {
    const list = await getAllProducts();
    return NextResponse.json(list);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load products.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
