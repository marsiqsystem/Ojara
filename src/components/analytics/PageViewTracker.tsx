"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { whenFbqReady } from "@/lib/analytics/capi";
import { getFbc } from "@/lib/analytics/identity";

/**
 * Fires the Meta standard `PageView` on the first load AND on every client-side
 * route change.
 *
 * The pixel's base snippet only runs on a hard load, so on an App Router site it
 * missed every in-app navigation — which is why Events Manager showed 10.2K
 * ViewContent against only 6.8K PageView. ViewContent was never inflated;
 * PageView was undercounted.
 *
 * Browser-pixel only, on purpose: PageView carries no conversion value, so
 * mirroring it to the Conversions API would multiply our serverless
 * invocations for no reporting gain. The conversion events in
 * lib/analytics/capi.ts still go to both.
 *
 * Uses `usePathname` alone rather than `useSearchParams` — the latter forces
 * every static route above it into client-side rendering unless it sits behind
 * a Suspense boundary, and this component lives in the root layout.
 */
export default function PageViewTracker() {
  const pathname = usePathname();
  // Guards against double-firing under React StrictMode's double-invoked
  // effects in development.
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    // Capture `?fbclid=` into the _fbc cookie on the landing hit, so the click
    // id is still attached to the Purchase several navigations later.
    getFbc();

    whenFbqReady((fbq) => fbq("track", "PageView"));
  }, [pathname]);

  return null;
}
