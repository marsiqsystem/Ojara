"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { scrollToTop } from "@/lib/scrollLock";

// Reset scroll to the top on every route change. Next resets native scroll on
// navigation, but Lenis keeps its own position and carries the previous page's
// offset over, so a new page could open scrolled halfway down. We skip the reset
// when the URL carries a hash (e.g. /#collection) so in-page anchor links still
// land on their target instead of snapping to the top.
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) return;
    scrollToTop(true);
  }, [pathname]);

  return null;
}
