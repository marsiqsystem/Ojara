// Client-side tracking helper.
//
// `trackEvent` does three things for one conversion, all sharing one eventId so
// Meta de-duplicates them instead of triple-counting:
//   1. fires the browser Meta Pixel directly via `fbq('track', …)` (see
//      components/analytics/MetaPixel.tsx for the base install), so events reach
//      Meta whether or not GTM is configured with the pixel,
//   2. pushes the event onto window.dataLayer so GTM (and any pixel/tags
//      configured inside GTM) can also fire it, and
//   3. POSTs the same event to /api/capi so the server-side Meta Conversions API
//      fires it too — better match quality and resilient to ad-blockers.
//
// The browser Pixel uses `eventID` and CAPI uses `event_id`; both carry the same
// value, which is how Meta collapses the duplicates into one conversion.
//
// Everything here is fire-and-forget and wrapped so a tracking failure can never
// break an actual user action (add to cart, checkout, etc.).

export type TrackUserData = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
};

export type TrackOptions = {
  /** Non-PII commerce data: value, currency, content_ids, contents, num_items… */
  customData?: Record<string, unknown>;
  userData?: TrackUserData;
  /** Provide to force a specific id; otherwise one is generated. */
  eventId?: string;
};

type TrackingWindow = Window & {
  dataLayer?: Record<string, unknown>[];
  // Injected by the Meta Pixel base snippet (components/analytics/MetaPixel.tsx).
  fbq?: (...args: unknown[]) => void;
};

const genEventId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// Read a cookie by name (used for Meta's _fbp / _fbc first-party cookies).
const readCookie = (name: string): string | undefined => {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
};

/**
 * Track a conversion event across GTM (client) and Meta CAPI (server).
 * Returns the eventId used, so a caller could correlate if needed.
 */
export function trackEvent(
  eventName: string,
  options: TrackOptions = {},
): string {
  const eventId = options.eventId || genEventId();

  if (typeof window === "undefined") return eventId;

  const w = window as TrackingWindow;

  try {
    // 1. Browser Meta Pixel — fired directly so it works without GTM. `eventID`
    // (capital ID) is the option key Meta reads to de-duplicate against CAPI.
    // All events we send (PageView, ViewContent, AddToCart, InitiateCheckout,
    // Purchase) are Meta standard events, so `track` (not `trackCustom`) is right.
    if (typeof w.fbq === "function") {
      w.fbq("track", eventName, options.customData || {}, { eventID: eventId });
    }
  } catch {
    // ignore — never block the user action
  }

  try {
    // 2. GTM / dataLayer. Harmless if no Meta tag is configured there; if one is,
    // the shared eventId keeps it from double-counting the direct Pixel fire.
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({
      event: eventName,
      eventId,
      ...options.customData,
    });
  } catch {
    // ignore — never block the user action
  }

  try {
    // 3. Server-side CAPI. Fire-and-forget; keepalive lets it survive navigation
    // (e.g. Purchase firing right before a redirect to the success page).
    const payload = {
      eventName,
      eventId,
      eventSourceUrl: window.location.href,
      actionSource: "website",
      userData: {
        ...options.userData,
        fbp: readCookie("_fbp"),
        fbc: readCookie("_fbc"),
      },
      customData: options.customData || {},
    };
    void fetch("/api/capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore — tracking must never throw into the caller
  }

  return eventId;
}
