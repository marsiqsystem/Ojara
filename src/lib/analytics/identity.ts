// Browser-side identifiers that raise Meta's Event Match Quality.
//
// Most OJARA visitors never type an email, so without these an event carries
// only an IP and a user-agent and matches almost nobody. Three cheap wins:
//
//   • external_id — a stable pseudonymous id we mint ourselves and send on every
//     event (hashed server-side). Ties a visitor's ViewContent to their Purchase
//     even when they were anonymous for the first ten page views.
//   • _fbp        — Meta's own first-party browser id, set by the Pixel.
//   • _fbc        — the click id. The Pixel only writes this cookie if it loaded
//     before the shopper navigated away; when an ad click lands with `?fbclid=`
//     and no cookie yet, we synthesise the value ourselves in Meta's documented
//     `fb.1.<timestamp>.<fbclid>` format and persist it.
//
// All of this is non-PII and best-effort: every function swallows its own
// errors and returns undefined rather than throwing into a click handler.

const EXTERNAL_ID_KEY = "ojara_eid";
const FBC_COOKIE = "_fbc";
const FBC_MAX_AGE_DAYS = 90;

/** Read a cookie by name. */
export const readCookie = (name: string): string | undefined => {
  if (typeof document === "undefined") return undefined;
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
};

const writeCookie = (name: string, value: string, days: number) => {
  try {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // ignore — a blocked cookie jar must not break tracking
  }
};

const randomId = () => {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

/**
 * The stable per-browser id. Created on first use and kept in localStorage;
 * returns undefined (rather than a fresh id every call) when storage is
 * unavailable, so we never send a useless one-shot identifier.
 */
export const getExternalId = (): string | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    const existing = window.localStorage.getItem(EXTERNAL_ID_KEY);
    if (existing) return existing;
    const fresh = randomId();
    window.localStorage.setItem(EXTERNAL_ID_KEY, fresh);
    return fresh;
  } catch {
    return undefined;
  }
};

/**
 * The Meta click id. Prefers the Pixel's own `_fbc` cookie; falls back to
 * building it from `?fbclid=` in the current URL and persisting that so later
 * events in the session (and the Purchase) still carry the click attribution.
 */
export const getFbc = (): string | undefined => {
  const cookie = readCookie(FBC_COOKIE);
  if (cookie) return cookie;
  if (typeof window === "undefined") return undefined;
  try {
    const fbclid = new URLSearchParams(window.location.search).get("fbclid");
    if (!fbclid) return undefined;
    const value = `fb.1.${Date.now()}.${fbclid}`;
    writeCookie(FBC_COOKIE, value, FBC_MAX_AGE_DAYS);
    return value;
  } catch {
    return undefined;
  }
};

export const getFbp = (): string | undefined => readCookie("_fbp");
