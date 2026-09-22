"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { scrollToTop } from "@/lib/scrollLock";
import {
  useCartStore,
  selectTotalQuantity,
  useCartHydrated,
} from "@/lib/store/useCartStore";
import dynamic from "next/dynamic";
import ShopMenu from "@/components/ShopMenu";
import MobileNav from "@/components/MobileNav";

const SearchOverlay = dynamic(() => import("@/components/SearchOverlay"), { ssr: false });

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
  "aria-hidden": true,
};

export default function Header() {
  const totalQuantity = useCartStore(selectTotalQuantity);
  const openCart = useCartStore((state) => state.openCart);
  const openAuth = useCartStore((state) => state.openAuth);
  const hydrated = useCartHydrated();
  const count = hydrated ? totalQuantity : 0;
  const pathname = usePathname();

  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-champagne-gold/30 bg-midnight-navy/95 backdrop-blur-sm">
        <div className="mx-auto grid grid-cols-3 items-center max-w-[1600px] px-4 sm:px-6 py-5">
          {/* Col 1: Mobile Hamburger / Desktop Navigation Links */}
          <div className="flex items-center justify-start">
            {/* Mobile: Hamburger Menu */}
            <div className="md:hidden flex items-center">
              <MobileNav />
            </div>

            {/* Desktop Menu */}
            <nav aria-label="Primary" className="hidden items-center md:flex md:gap-4 lg:gap-6">
              <ShopMenu />
              <Link
                href="/our-story"
                prefetch
                className="rounded-full px-3 py-2 text-xs uppercase tracking-[0.25em] text-champagne-gold transition-colors duration-300 ease-out hover:text-ivory"
              >
                Our Story
              </Link>
              <Link
                href="/faq"
                prefetch
                className="rounded-full px-3 py-2 text-xs uppercase tracking-[0.25em] text-champagne-gold transition-colors duration-300 ease-out hover:text-ivory"
              >
                FAQ
              </Link>
            </nav>
          </div>

          {/* Col 2: Perfectly Centered Logo (Horizontal Usage) */}
          <div className="flex items-center justify-center">
            <Link
              href="/"
              prefetch
              onClick={(e) => {
                // Already home: the route doesn't change, so tapping the logo
                // would do nothing. Intercept and glide to the top instead.
                if (pathname === "/") {
                  e.preventDefault();
                  scrollToTop(false);
                }
              }}
              className="flex items-center gap-2 sm:gap-3 group cursor-pointer transition-all duration-150 active:scale-95"
            >
              {/* Brand mark — client gem art (bg removed) — beside the wordmark.
                  Deliberately smaller on mobile: at 40px it dominated the phone
                  header. h-7 on mobile, h-10 from sm up. */}
              <Image
                alt="Ojara"
                className="h-7 w-auto object-contain transition-transform duration-500 group-hover:scale-105 sm:h-10"
                height={40}
                width={36}
                priority
                src="/logo.png"
              />
              <span className="font-heading text-lg uppercase tracking-[0.25em] text-champagne-gold sm:text-2xl sm:tracking-[0.3em]">
                OJARA
              </span>
            </Link>
          </div>

          {/* Col 3: Desktop Controls / Mobile Search Only */}
          <div className="flex items-center justify-end gap-1 sm:gap-2">
            {/* Search (Desktop & Mobile) */}
            <button
              type="button"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="cursor-pointer rounded-full p-2 text-champagne-gold transition-all duration-150 hover:text-ivory active:scale-95"
            >
              <svg {...iconProps}>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>

            {/* Profile/Account (Desktop Only) */}
            <div className="hidden md:block">
              <button
                type="button"
                aria-label="Account"
                onClick={openAuth}
                className="cursor-pointer rounded-full p-2 text-champagne-gold transition-all duration-150 hover:text-ivory active:scale-95"
              >
                <svg {...iconProps}>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
                </svg>
              </button>
            </div>

            {/* Cart (Desktop Only) */}
            <div className="hidden md:block">
              <button
                type="button"
                aria-label="Cart"
                onClick={openCart}
                className="relative cursor-pointer rounded-full p-2 text-champagne-gold transition-all duration-150 hover:text-ivory active:scale-95"
              >
                <svg {...iconProps}>
                  <circle cx="9" cy="20" r="1" />
                  <circle cx="18" cy="20" r="1" />
                  <path d="M2.5 3h2l2.2 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 7H6" />
                </svg>
                {count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-champagne-gold text-[10px] font-medium text-midnight-navy">
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
