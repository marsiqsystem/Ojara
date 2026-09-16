"use client";

import { useRouter } from "next/navigation";
import { SHOP_SORTS, shopHref, type ShopParams, type ShopSort } from "@/lib/shopFilters";

/** Native select: the phone's own picker is the fastest sort UI there is. */
export default function SortSelect({ basePath, params }: { basePath: string; params: ShopParams }) {
  const router = useRouter();

  return (
    <label className="relative flex shrink-0 items-center">
      <span className="sr-only">Sort pieces</span>
      <svg className="pointer-events-none absolute left-2.5 h-4 w-4 text-midnight-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h13M3 12h9M3 17h5M17 10v10m0 0-3-3m3 3 3-3" />
      </svg>
      <select
        value={params.sort}
        onChange={(e) =>
          router.push(shopHref(basePath, { ...params, sort: e.target.value as ShopSort }), { scroll: false })
        }
        className="h-9 cursor-pointer appearance-none rounded-full border border-midnight-navy/25 bg-white py-0 pl-8 pr-7 text-[0.8rem] font-semibold text-midnight-navy outline-none focus:border-champagne-gold"
      >
        {SHOP_SORTS.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-2.5 h-3 w-3 text-midnight-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}
