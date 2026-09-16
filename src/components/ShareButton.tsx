"use client";

import { useState } from "react";

type ShareButtonProps = {
  productName: string;
  className?: string;
};

// "Ask a friend" — a second opinion is often what stands between "maybe" and
// buying (the Viora PDP tile). Native share sheet where the browser supports it
// (mobile, some desktops); otherwise copy the page URL and flash "Link copied" so
// the tap is never a no-op.
export default function ShareButton({ productName, className = "" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: `${productName} | OJARA`,
      text: `What do you think of the ${productName} from OJARA?`,
      url,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User dismissed the sheet, or share failed — fall through to copy.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context) — nothing else to do.
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={`Share ${productName} with a friend`}
      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border border-champagne-gold/30 px-3 py-2.5 text-left transition-colors hover:border-champagne-gold ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0 text-champagne-gold"
        aria-hidden="true"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      <span className="text-xs leading-tight">
        <span className="block font-semibold text-midnight-navy">
          {copied ? "Link copied" : "Ask a friend"}
        </span>
        <span className="text-midnight-navy/55">Share for a second opinion</span>
      </span>
    </button>
  );
}
