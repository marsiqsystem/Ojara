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
// It then pushes a FOURTH thing that is not about Meta at all: a GA4-shaped
// ecommerce event. GA4 records 3.5K users but zero key events, because the only
// dataLayer pushes it ever saw were Meta-shaped (`event: "ViewContent"`, flat
// params) and GA4 speaks `event: "view_item"` with a nested `ecommerce` object.
// The two pushes are emitted side by side rather than one being converted into
// the other, so the Meta path is byte-for-byte what it always was.
//
// The browser Pixel uses `eventID` and CAPI uses `event_id`; both carry the same
// value, which is how Meta collapses the duplicates into one conversion.
//
// Everything here is fire-and-forget and wrapped so a tracking failure can never
// break an actual user action (add to cart, checkout, etc.).

import { getExternalId, getFbc, getFbp } from "@/lib/analytics/identity";
import type { Ga4Item } from "@/lib/analytics/content";

export type TrackUserData = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  // Address fields — worth sending on Purchase, where we actually have them.
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

export type TrackOptions = {
  /** Non-PII commerce data: value, currency, content_ids, contents, num_items… */
  customData?: Record<string, unknown>;
  userData?: TrackUserData;
  /** Provide to force a specific id; otherwise one is generated. */
  eventId?: string;
  /**
   * Line items for the GA4 `ecommerce` push. Omit and no GA4 event is emitted —
   * GA4 ecommerce reports are useless without items, so a half-populated event
   * is worse than none.
   */
  items?: Ga4Item[];
};

// Meta event name → GA4 event name. Only the four commerce events the plan puts
// tags behind in GTM are mapped: emitting GA4 events nothing listens for would
// just be noise in the dataLayer.
const GA4_EVENT_NAMES: Record<string, string> = {
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
};

type TrackingWindow = Window & {
  dataLayer?: Record<string, unknown>[];
  // Injected by the Meta Pixel base snippet (components/analytics/MetaPixel.tsx).
  fbq?: (...args: unknown[]) => void;
};

const genEventId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Run `fn` once `fbq` exists. The base snippet loads with `afterInteractive`, so
 * an event fired from a mount effect (ViewContent, PageView) can beat it by a
 * few hundred milliseconds on a cold load — those events used to be dropped on
 * the floor. Once the stub exists it queues calls itself, so a short poll is all
 * that's needed. Gives up after ~5s (pixel blocked, offline, etc.).
 */
export function whenFbqReady(fn: (fbq: (...args: unknown[]) => void) => void) {
  if (typeof window === "undefined") return;
  const w = window as TrackingWindow;
  if (typeof w.fbq === "function") return fn(w.fbq);

  let tries = 0;
  const id = window.setInterval(() => {
    if (typeof w.fbq === "function") {
      window.clearInterval(id);
      try {
        fn(w.fbq);
      } catch {
        // ignore — never block the user action
      }
    } else if (++tries > 50) {
      window.clearInterval(id);
    }
  }, 100);
}

/**
 * Identifiers to hand to a server route that will send a CAPI event on our
 * behalf (see /api/checkout's Purchase). Cookies and localStorage are
 * browser-only, so the server cannot derive these itself.
 */
export const trackingContext = () => ({
  externalId: getExternalId(),
  fbp: getFbp(),
  fbc: getFbc(),
  eventSourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
});

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
    whenFbqReady((fbq) =>
      fbq("track", eventName, options.customData || {}, { eventID: eventId }),
    );
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
    // 2b. GA4 ecommerce. A SEPARATE push in GA4's own vocabulary, so GA4 finally
    // sees commerce instead of bare pageviews. Nothing consumes it until the
    // matching GTM triggers + tags exist, and it cannot disturb the Meta push
    // above, which is emitted unchanged either way.
    const ga4Event = GA4_EVENT_NAMES[eventName];
    if (ga4Event && options.items?.length) {
      const custom = options.customData || {};
      w.dataLayer = w.dataLayer || [];
      // GA4's documented reset: without it, `items` from the previous ecommerce
      // event leak into this one, because dataLayer merges rather than replaces.
      w.dataLayer.push({ ecommerce: null });
      w.dataLayer.push({
        event: ga4Event,
        ecommerce: {
          currency: (custom.currency as string) || "INR",
          value: custom.value,
          // GA4 de-duplicates purchases on transaction_id, exactly as Meta does
          // on event_id — so a refresh of the success page can't double-count.
          ...(custom.order_id ? { transaction_id: custom.order_id } : {}),
          items: options.items,
        },
      });
    }
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
        // Match-quality identifiers. `externalId` is present for practically
        // every visitor, which is what makes anonymous browsing attributable.
        externalId: getExternalId(),
        fbp: getFbp(),
        fbc: getFbc(),
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
