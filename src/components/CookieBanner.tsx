"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "ojara-cookie-consent";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== "accepted") {
      // Small delay so it eases in after the page settles.
      const id = window.setTimeout(() => setIsVisible(true), 600);
      return () => window.clearTimeout(id);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 w-full z-[100] pointer-events-none"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:justify-between sm:gap-8">
        <div className="pointer-events-auto rounded-2xl border border-champagne-gold/25 bg-midnight-navy/95 px-6 py-4 shadow-xl backdrop-blur-sm sm:flex sm:flex-1 sm:items-center sm:justify-between sm:gap-6">
          <p className="text-center text-xs leading-6 text-ivory/80 sm:text-left sm:text-sm">
            We use cookies to enhance your spiritual journey — remembering your
            bag and tailoring your experience. See our{" "}
            <Link
              href="/privacy"
              prefetch
              className="text-champagne-gold underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={accept}
            className="mt-4 w-full flex-shrink-0 cursor-pointer rounded-full bg-champagne-gold px-8 py-3 text-xs font-medium uppercase tracking-[0.2em] text-midnight-navy transition-all duration-150 hover:bg-champagne-gold/85 active:scale-95 sm:mt-0 sm:w-auto"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
