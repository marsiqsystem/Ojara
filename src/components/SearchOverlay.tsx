"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import { formatPrice } from "@/lib/format";
import { trackEvent } from "@/lib/analytics/capi";
import type { Product } from "@/lib/catalog";

// Trending searches deep-link to the most relevant piece, shown when the field
// is empty.
const trending = [
  { label: "Evil Eye", href: "/product/black-tourmaline-evil-eye" },
  { label: "Citrine", href: "/product/citrine-bracelet" },
  { label: "Lapis Lazuli", href: "/product/lapis-lazuli-bracelet" },
];

// Match a product against the typed query. A hit is either a substring of the
// full name, or any WORD of the name starting with the query — so "citr", "lapis"
// or the second word ("eye", "bracelet") all surface the right piece.
function matches(product: Product, q: string): boolean {
  const name = product.name.toLowerCase();
  if (name.includes(q)) return true;
  return name.split(/\s+/).some((word) => word.startsWith(q));
}

export default function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Clear the field on the way out so the overlay always opens fresh — done in
  // the close handler (an event callback) rather than an effect.
  const handleClose = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  // Load the catalogue once, the first time the overlay opens. /api/products is
  // the same Wix-backed list the rest of the site reads.
  useEffect(() => {
    if (!open || products.length > 0) return;
    let cancelled = false;
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Product[]) => {
        if (!cancelled && Array.isArray(data)) setProducts(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, products.length]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    lockScroll();
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
      window.clearTimeout(id);
    };
  }, [open, handleClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => matches(p, q)).slice(0, 6);
  }, [query, products]);

  const trimmed = query.trim();

  // Fire the Meta `Search` event once the query settles (debounced 800ms) rather
  // than on every keystroke, and only for queries of 2+ characters. Carries the
  // ids of what matched so Meta can attribute searches to catalogue items.
  useEffect(() => {
    if (!open) return;
    const q = trimmed;
    if (q.length < 2) return;
    const id = window.setTimeout(() => {
      const hits = products.filter((p) => matches(p, q.toLowerCase()));
      trackEvent("Search", {
        customData: {
          search_string: q,
          content_ids: hits.slice(0, 6).map((p) => p.id),
          content_type: "product",
        },
      });
    }, 800);
    return () => window.clearTimeout(id);
  }, [open, trimmed, products]);

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-[90] bg-midnight-navy/80 backdrop-blur-md transition-opacity duration-500 ease-out ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={handleClose}
    >
      {/* Close */}
      <button
        type="button"
        aria-label="Close search"
        onClick={handleClose}
        className="absolute right-6 top-6 z-10 cursor-pointer rounded-full p-2 text-champagne-gold transition-all duration-150 hover:text-ivory active:scale-95"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Panel — stop propagation so clicks inside don't close */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onClick={(e) => e.stopPropagation()}
        className={`mx-auto flex min-h-full max-w-3xl flex-col justify-center px-6 py-20 transition-transform duration-500 ease-out ${
          open ? "translate-y-0" : "-translate-y-4"
        }`}
      >
        <span className="text-center text-xs uppercase tracking-[0.4em] text-champagne-gold">
          Search
        </span>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (results.length > 0) {
              router.push(`/product/${results[0].id}`);
              handleClose();
            }
          }}
          className="mt-8 border-b border-champagne-gold/50 focus-within:border-champagne-gold"
        >
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you seeking?"
            aria-label="Search sacred objects"
            className="w-full bg-transparent pb-4 text-center font-heading text-3xl text-ivory placeholder:text-ivory/70 focus:outline-none sm:text-4xl"
          />
        </form>

        {/* Live results */}
        {trimmed ? (
          <div className="mt-8">
            {results.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {results.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/product/${product.id}`}
                      prefetch
                      onClick={handleClose}
                      className="group flex items-center gap-4 rounded-2xl border border-champagne-gold/20 bg-midnight-navy/40 p-3 transition-all duration-150 hover:border-champagne-gold/60 hover:bg-midnight-navy/70 active:scale-[0.99]"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-midnight-navy/40">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-heading text-base text-ivory">
                          {product.name}
                        </p>
                        <p className="mt-0.5 text-sm text-champagne-gold">
                          {formatPrice(product.price)}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className="text-champagne-gold/70 transition-transform duration-300 group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-sm text-ivory/70">
                No pieces match “{trimmed}”. Try a stone or an intention.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-10 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-ivory/80">
              Trending Searches
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {trending.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  prefetch
                  onClick={handleClose}
                  className="cursor-pointer rounded-full border border-champagne-gold/30 px-5 py-2 text-sm tracking-wide text-ivory/90 transition-all duration-150 hover:border-champagne-gold hover:bg-champagne-gold/15 active:scale-95"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
