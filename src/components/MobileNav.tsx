"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { toast } from "sonner";
import type { Category } from "@/lib/catalog";
import { LINES } from "@/lib/lines";
import { useCartStore } from "@/lib/store/useCartStore";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

// The mega menu's counterpart below the md breakpoint. Modelled on Viora's
// slide-in drawer: primary destinations up top with icons, the full collection
// list below. A hover popover doesn't translate to touch, so this replaces it.
const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const chevron = (
  <svg {...iconProps} width={16} height={16} className="text-midnight-navy/30">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const openAuth = useCartStore((state) => state.openAuth);

  // Portal target only exists after mount (SSR has no document.body).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount flag for the portal guard
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) setCategories(await res.json());
      } catch (e) {
        console.error("Failed to load categories in MobileNav:", e);
      }
    }
    load();
  }, []);

  // Lock body scroll while the sheet is open; close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    lockScroll();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
    };
  }, [open]);

  const close = () => setOpen(false);

  const comingSoon = (label: string) =>
    toast.success(`✦ ${label} unlocking for your account soon.`, {
      style: { background: "#071A47", color: "#F7F3EB", border: "none" },
    });

  const shopLines = [
    {
      line: LINES.intentions,
      items: categories.filter((c) => c.group !== "adorn" && c.slug !== "all-products"),
    },
    { line: LINES.adorn, items: categories.filter((c) => c.group === "adorn") },
  ];

  // Primary destinations, in Viora's order.
  const primaryLinks = [
    {
      label: "Home",
      href: "/",
      icon: (
        <svg {...iconProps}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V20h13V9.5" />
        </svg>
      ),
    },
    {
      label: "Our Story",
      href: "/our-story",
      icon: (
        <svg {...iconProps}>
          <path d="M12 6.5C10.5 5 8.5 4.5 6 4.5V18c2.5 0 4.5.5 6 2 1.5-1.5 3.5-2 6-2V4.5c-2.5 0-4.5.5-6 2Z" />
          <path d="M12 6.5V20" />
        </svg>
      ),
    },
    {
      label: "Contact Us",
      href: "/contact",
      icon: (
        <svg {...iconProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      ),
    },
    {
      label: "FAQ",
      href: "/faq",
      icon: (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7" />
          <path d="M12 17h.01" />
        </svg>
      ),
    },
  ];

  const actionLinks = [
    {
      label: "Wishlist",
      onClick: () => comingSoon("Wishlist"),
      icon: (
        <svg {...iconProps}>
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      ),
    },
    {
      label: "My Profile",
      onClick: () => {
        close();
        openAuth();
      },
      icon: (
        <svg {...iconProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
        </svg>
      ),
    },
    {
      label: "My Orders",
      onClick: () => comingSoon("Order tracking"),
      icon: (
        <svg {...iconProps}>
          <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
          <path d="M3 7.5 12 12l9-4.5M12 12v9" />
        </svg>
      ),
    },
  ];

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-full p-2 text-champagne-gold transition-all duration-150 hover:text-ivory active:scale-95"
      >
        <svg {...iconProps} width={22} height={22} stroke="currentColor">
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      </button>

      {/* Overlay portalled to <body> so its z-index isn't trapped inside the
          sticky header's stacking context (which would let the bottom nav show
          through the backdrop). */}
      {mounted &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              onClick={close}
              aria-hidden="true"
              className={`fixed inset-0 z-[80] bg-midnight-navy/50 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${
                open ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            />

            {/* Slide-in drawer */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className={`fixed inset-y-0 left-0 z-[85] flex w-[82%] max-w-xs flex-col bg-ivory shadow-2xl transition-transform duration-300 ease-out md:hidden ${
                open ? "translate-x-0" : "-translate-x-full"
              }`}
            >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-champagne-gold/25 px-5 py-4">
          <span className="font-heading text-lg uppercase tracking-[0.25em] text-midnight-navy">
            Menu
          </span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="cursor-pointer rounded-full p-1.5 text-midnight-navy/60 transition-colors hover:text-midnight-navy active:scale-95"
          >
            <svg {...iconProps} stroke="currentColor">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div data-lenis-prevent className="flex-1 overflow-y-auto">
          {/* Shop first — the two lines, each with its own pages. Shoppers
              open the menu to find something; the brand pages can wait. */}
          <div className="space-y-3 border-b border-champagne-gold/25 px-4 py-4">
            {shopLines.map(({ line, items }) => (
              <div key={line.key} className="rounded-2xl bg-midnight-navy p-4 text-ivory">
                <Link href={line.href} prefetch onClick={close} className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block font-heading text-xl text-champagne-gold">{line.name}</span>
                    <span className="block text-[0.7rem] leading-snug text-ivory/70">{line.descriptor}</span>
                  </span>
                  <span aria-hidden="true" className="text-champagne-gold">→</span>
                </Link>
                {items.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {items.map((category) => (
                      <li key={category.slug}>
                        <Link
                          href={`/category/${category.slug}`}
                          prefetch
                          onClick={close}
                          className="block rounded-full border border-champagne-gold/40 px-3 py-1.5 text-xs text-ivory/90 transition-colors hover:bg-champagne-gold hover:text-midnight-navy"
                        >
                          {category.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-champagne-gold/90">Coming soon — tap to get notified.</p>
                )}
              </div>
            ))}
            <Link
              href="/collection"
              prefetch
              onClick={close}
              className="block text-center text-xs font-semibold uppercase tracking-[0.2em] text-midnight-navy/70 hover:text-champagne-gold"
            >
              Shop everything →
            </Link>
          </div>

          {/* Primary + action rows */}
          <ul className="px-2 py-3">
            {primaryLinks.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  prefetch
                  onClick={close}
                  className="flex items-center gap-4 rounded-xl px-3 py-3 text-[0.95rem] text-midnight-navy transition-colors hover:bg-sand/50"
                >
                  <span className="text-champagne-gold">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {chevron}
                </Link>
              </li>
            ))}
            {actionLinks.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={item.onClick}
                  className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left text-[0.95rem] text-midnight-navy transition-colors hover:bg-sand/50"
                >
                  <span className="text-champagne-gold">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {chevron}
                </button>
              </li>
            ))}
          </ul>

        </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
