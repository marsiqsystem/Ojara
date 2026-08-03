import { NextResponse } from "next/server";
import { clientIp, isRateLimited, isSameOrigin } from "@/lib/apiGuard";
import {
  CAPI_ENABLED,
  requestContext,
  sendMetaEvent,
  type MetaUserData,
} from "@/lib/analytics/meta";

// ============================================================================
// Meta Conversions API (server-side pixel) — browser-originated events.
//
// The access token NEVER touches the browser: the frontend calls this route
// (see src/lib/analytics/capi.ts) and lib/analytics/meta.ts forwards a hashed,
// server-signed event to Meta's Graph API. Each event is paired with the
// browser Pixel fire under the SAME event_id, so Meta de-duplicates them.
//
// Env (see .env): META_PIXEL_ID, META_CAPI_ACCESS_TOKEN, optional
// META_TEST_EVENT_CODE (shows events in Meta's Test Events tab while wiring up).
// If either required var is missing the route is a safe no-op, so the frontend
// can call it in any environment without erroring.
//
// This route is public and hits a paid third-party API, so it carries the same
// abuse protection as the mail routes — a scraper replaying it could otherwise
// poison the pixel with fake conversions. The rate limit is far looser than the
// forms' though: one genuine shopper legitimately fires a dozen-plus events.
// ============================================================================

const RATE_LIMIT_MAX = 200;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

type CapiRequestBody = {
  eventName?: string;
  eventId?: string;
  eventSourceUrl?: string;
  actionSource?: string;
  userData?: MetaUserData;
  // Non-PII: value, currency, content_ids, contents, num_items, etc.
  customData?: Record<string, unknown>;
};

export async function POST(req: Request) {
  // No keys yet → succeed silently so callers never see an error.
  if (!CAPI_ENABLED) {
    return NextResponse.json({ ok: false, skipped: true }, { status: 200 });
  }

  // Only our own pages may send events. A browser fetch from the site always
  // carries a matching Origin; curl/replay scripts generally do not.
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, skipped: true }, { status: 200 });
  }

  if (isRateLimited(`capi:${clientIp(req)}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json({ ok: false, skipped: true }, { status: 200 });
  }

  const body = (await req.json().catch(() => ({}))) as CapiRequestBody;
  const { eventName, eventId, eventSourceUrl, actionSource, userData, customData } =
    body;

  if (!eventName) {
    return NextResponse.json({ error: "eventName is required." }, { status: 400 });
  }

  const result = await sendMetaEvent({
    eventName,
    eventId,
    eventSourceUrl,
    actionSource,
    userData: { ...userData, ...requestContext(req) },
    customData,
  });

  // Always 200: a tracking failure must never surface as a broken user action.
  return NextResponse.json(result, { status: 200 });
}
