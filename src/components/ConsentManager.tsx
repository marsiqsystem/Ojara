"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GoogleTagManager from "@/components/analytics/GoogleTagManager";
import MetaPixel from "@/components/analytics/MetaPixel";
import PageViewTracker from "@/components/analytics/PageViewTracker";

// ─────────────────────────────────────────────────────────────────────────────
// Consent manager (opt-out model).
//
// Trackers LOAD BY DEFAULT and only stop once a visitor explicitly declines — the
// same model as the sibling build. So for everyone who never touches the banner,
// analytics behaviour is exactly what it was before this component existed.
//
// It owns the mounting of the GTM container (Analytics consent) and the Meta Pixel
// + PageViewTracker (Marketing consent). GA4 + Clarity live inside the GTM
// container, so the single GTM switch covers all three of them; the Pixel and its
// route-change PageView tracker are mounted here exactly as the root layout used
// to mount them — just gated on consent (opt-out, so they still fire for everyone
// who doesn't explicitly decline).
//
// The visible banner intentionally matches the old CookieBanner styling — same
// navy pill, gold accents, bottom position — with Reject/Customise added.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "ojara-consent-v2";

type Consent = { analytics: boolean; marketing: boolean };

const ACCEPT_ALL: Consent = { analytics: true, marketing: true };
const REJECT_ALL: Consent = { analytics: false, marketing: false };

function readStored(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    return {
      analytics: !!parsed.analytics,
      marketing: !!parsed.marketing,
    };
  } catch {
    return null;
  }
}

export default function ConsentManager() {
  // `decided` is null until we've read localStorage on the client (avoids a
  // hydration mismatch — the server renders nothing tracker-related).
  const [decided, setDecided] = useState<Consent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showCustomise, setShowCustomise] = useState(false);
  const [draft, setDraft] = useState<Consent>(ACCEPT_ALL);

  useEffect(() => {
    const stored = readStored();
    // Defer the state updates out of the effect body (via rAF / setTimeout) so we
    // don't trip the React Compiler's set-state-in-effect rule or cause cascading
    // synchronous renders. Undecided → opt-out default: load trackers, show banner.
    const raf = requestAnimationFrame(() => setDecided(stored ?? ACCEPT_ALL));
    let bannerTimer: number | undefined;
    if (!stored) {
      bannerTimer = window.setTimeout(() => setShowBanner(true), 600);
    }
    return () => {
      cancelAnimationFrame(raf);
      if (bannerTimer !== undefined) window.clearTimeout(bannerTimer);
    };
  }, []);

  const persist = (consent: Consent) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch {
      /* storage disabled — session-only consent is acceptable */
    }
    setDecided(consent);
    setShowBanner(false);
    setShowCustomise(false);
  };

  return (
    <>
      {/* Trackers — gated by consent. `decided` is null on the server and until
          the effect resolves, so no tag ships without a decision in place. */}
      {decided?.analytics && <GoogleTagManager />}
      {decided?.marketing && (
        <>
          <MetaPixel />
          <PageViewTracker />
        </>
      )}

      {showBanner && (
        <div className="fixed bottom-0 left-0 z-[100] w-full pointer-events-none">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:justify-between sm:gap-8">
            <div className="pointer-events-auto w-full rounded-2xl border border-champagne-gold/25 bg-midnight-navy/95 px-6 py-4 shadow-xl backdrop-blur-sm">
              <div className="sm:flex sm:items-center sm:justify-between sm:gap-6">
                <p className="text-center text-xs leading-6 text-ivory/80 sm:text-left sm:text-sm">
                  We use cookies to enhance your spiritual journey — remembering
                  your bag and understanding how the site is used. See our{" "}
                  <Link
                    href="/privacy"
                    prefetch
                    className="text-champagne-gold underline-offset-4 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
                <div className="mt-4 flex flex-shrink-0 flex-col gap-2 sm:mt-0 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setShowCustomise((v) => !v)}
                    className="order-2 cursor-pointer rounded-full px-5 py-2.5 text-xs font-medium uppercase tracking-[0.15em] text-ivory/60 transition-colors hover:text-ivory sm:order-1"
                  >
                    Customise
                  </button>
                  <button
                    type="button"
                    onClick={() => persist(REJECT_ALL)}
                    className="order-3 cursor-pointer rounded-full border border-ivory/25 px-6 py-2.5 text-xs font-medium uppercase tracking-[0.15em] text-ivory/80 transition-colors hover:border-ivory/50 hover:text-ivory sm:order-2"
                  >
                    Reject all
                  </button>
                  <button
                    type="button"
                    onClick={() => persist(ACCEPT_ALL)}
                    className="order-1 cursor-pointer rounded-full bg-champagne-gold px-8 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-midnight-navy transition-all duration-150 hover:bg-champagne-gold/85 active:scale-95 sm:order-3"
                  >
                    Accept all
                  </button>
                </div>
              </div>

              {showCustomise && (
                <div className="mt-4 space-y-3 border-t border-champagne-gold/20 pt-4">
                  <label className="flex cursor-pointer items-start gap-3 text-xs leading-6 text-ivory/80">
                    <input
                      type="checkbox"
                      checked={draft.analytics}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, analytics: e.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 accent-champagne-gold"
                    />
                    <span>
                      <span className="font-medium text-ivory">Analytics</span> —
                      helps us understand which pieces and pages resonate (Google
                      Analytics, Clarity).
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 text-xs leading-6 text-ivory/80">
                    <input
                      type="checkbox"
                      checked={draft.marketing}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, marketing: e.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 accent-champagne-gold"
                    />
                    <span>
                      <span className="font-medium text-ivory">Marketing</span> —
                      lets us measure ads so we show you fewer, more relevant ones
                      (Meta Pixel).
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => persist(draft)}
                    className="cursor-pointer rounded-full border border-champagne-gold/50 px-6 py-2 text-xs font-medium uppercase tracking-[0.15em] text-champagne-gold transition-colors hover:bg-champagne-gold hover:text-midnight-navy"
                  >
                    Save choices
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
