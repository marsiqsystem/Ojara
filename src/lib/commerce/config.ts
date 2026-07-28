// ============================================================================
// Commerce mode switch — the single flag that flips the whole stack from the
// pre-keys "mock" mode to the live Wix + Razorpay + Gmail mode.
//
// It reads NEXT_PUBLIC_WIX_CLIENT_ID because that key is (a) the one thing every
// Wix-backed feature needs to even initialise the client, and (b) browser-safe,
// so the same truthy check works in both server routes and client components.
//
// While it is false:
//   • the cart uses the local Zustand store (site stays demoable),
//   • the checkout orchestrator returns a MOCK order id but still renders/sends
//     the real confirmation email,
//   • coupons validate against the frontend tier mirror in ./pricing.
//
// The moment the owner pastes the Wix client id into .env.local it flips true and
// the real Wix cart / coupon engine / order creation take over. See the Phase 2
// checklist in OJARA-HANDOVER.md + the plan file.
// ============================================================================

export const WIX_ENABLED = !!process.env.NEXT_PUBLIC_WIX_CLIENT_ID;

/** True only on the server when the admin API key is present (order creation). */
export const WIX_ADMIN_ENABLED = !!process.env.WIX_API_KEY;

/** True when Razorpay server credentials exist (prepaid online payments). */
export const RAZORPAY_ENABLED = !!(
  (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) &&
  process.env.RAZORPAY_KEY_SECRET
);

/** True when Gmail SMTP credentials exist (any outbound email). */
export const EMAIL_ENABLED = !!(
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
);

/**
 * Normalised site URL (no trailing slash). Used in emails + redirects.
 *
 * Order confirmations went out with "Visit OJARA" and the footer both pointing at
 * localhost:3000 — dead links in a real customer's inbox. So a localhost value is
 * treated as unset whenever we're running on Vercel. In production we point at the
 * connected custom domain (ojara.co.in) rather than the raw *.vercel.app host, so
 * customer-facing links carry the real brand. NEXT_PUBLIC_SITE_URL still wins for
 * an explicit override; it just can't drag production back to localhost.
 */
const PRODUCTION_SITE_URL = "https://www.ojara.co.in";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const configuredIsLocal =
  !!configuredSiteUrl && /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(configuredSiteUrl);

export const SITE_URL = (
  (configuredSiteUrl && !(vercelHost && configuredIsLocal) ? configuredSiteUrl : "") ||
  (vercelHost ? PRODUCTION_SITE_URL : "") ||
  "http://localhost:3000"
).replace(/\/$/, "");

export const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL || process.env.GMAIL_USER || "ojara.jewel@gmail.com";

export const BRAND_NAME = "OJARA";
