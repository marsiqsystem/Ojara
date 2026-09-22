"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCartStore, selectTotalQuantity } from "@/lib/store/useCartStore";
import { useState } from "react";
import dynamic from "next/dynamic";
import { WELCOME_CODE, WELCOME_PERCENT } from "@/lib/commerce/offers";

const SearchOverlay = dynamic(() => import("@/components/SearchOverlay"), { ssr: false });

type Tab = {
  id: string;
  label: string;
  match: (path: string) => boolean;
  href?: string;
  onTap?: () => void;
  icon: (active: boolean) => React.ReactNode;
  showBadge?: boolean;
};

export default function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const cartQuantity = useCartStore(selectTotalQuantity);
  const openCart = useCartStore((state) => state.openCart);
  const openAuth = useCartStore((state) => state.openAuth);
  const authOpen = useCartStore((state) => state.isAuthOpen);

  const [searchOpen, setSearchOpen] = useState(false);

  const iconProps = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const tabs: Tab[] = [
    {
      id: "search",
      label: "Search",
      onTap: () => setSearchOpen(true),
      match: () => searchOpen,
      icon: (active) => (
        <svg {...iconProps} className={active ? "text-champagne-gold" : "text-midnight-navy"}>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      ),
    },
    // Was a "Wishlist" tab that only toasted "unlocking soon… coming next week" —
    // a feature that doesn't exist. Shop is a real destination: the full catalogue.
    {
      id: "shop",
      label: "Shop",
      href: "/collection",
      match: (p) => p === "/collection" || p.startsWith("/category/"),
      icon: (active) => (
        <svg {...iconProps} className={active ? "text-champagne-gold" : "text-midnight-navy"}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      id: "profile",
      label: "Profile",
      onTap: openAuth,
      match: () => authOpen,
      icon: (active) => (
        <svg
          {...iconProps}
          fill={active ? "#D6AF7A" : "none"}
          className={active ? "text-champagne-gold" : "text-midnight-navy"}
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
        </svg>
      ),
    },
    {
      id: "cart",
      label: "Cart",
      onTap: openCart,
      match: (p) => p === "/cart",
      icon: (active) => (
        <svg {...iconProps} className={active ? "text-champagne-gold" : "text-midnight-navy"}>
          <circle cx="9" cy="20" r="1" />
          <circle cx="18" cy="20" r="1" />
          <path d="M2.5 3h2l2.2 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 7H6" />
        </svg>
      ),
      showBadge: true,
    },
  ];

  return (
    <>
      {/* Sticky banner — the first-order offer everyone qualifies for (see
          lib/commerce/offers). */}
      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 w-full z-[70] bg-midnight-navy border-t border-champagne-gold/30 text-champagne-gold py-2 text-center text-[10px] sm:text-xs font-semibold tracking-widest uppercase md:hidden">
        ✦ {WELCOME_PERCENT}% OFF FIRST ORDER · CODE {WELCOME_CODE} ✦
      </div>

      <nav
        aria-label="Primary mobile navigation"
        className="fixed bottom-0 left-0 w-full z-[75] bg-ivory border-t border-champagne-gold/30 shadow-lg block md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-4">
          {tabs.map((tab) => {
            const active = tab.href ? tab.match(pathname) : tab.match("");

            const content = (
              <div className="flex flex-col items-center justify-center gap-1 px-2 py-2 min-h-[64px] min-w-[44px] relative">
                <span className="relative">
                  {tab.icon(active)}
                  {tab.showBadge && cartQuantity > 0 && (
                    <span className="absolute -top-1.5 -right-2 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-champagne-gold px-1 text-[9px] font-semibold text-midnight-navy">
                      {cartQuantity}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] font-medium tracking-wider uppercase font-sans ${
                    active ? "text-champagne-gold" : "text-midnight-navy/70"
                  }`}
                >
                  {tab.label}
                </span>
                {/* Active indicator bar along the top edge */}
                <span
                  aria-hidden
                  className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full bg-champagne-gold transition-opacity duration-300 ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>
            );

            return (
              <li key={tab.id} className="flex">
                {tab.href ? (
                  <Link
                    href={tab.href}
                    aria-label={tab.label}
                    className="flex-1 cursor-pointer transition-all duration-150 active:scale-95"
                    aria-current={active ? "page" : undefined}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={tab.onTap}
                    aria-label={tab.label}
                    className="flex-1 cursor-pointer outline-none transition-all duration-150 active:scale-95"
                    aria-current={active ? "page" : undefined}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Overlays controlled by bottom nav */}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
