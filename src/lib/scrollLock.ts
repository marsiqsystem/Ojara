// Scroll lock for modals/drawers, using native scrolling.
//
// The site previously drove scrolling through a Lenis smooth-scroll instance,
// which needed special handling here to pause it while a modal was open. Lenis
// was removed (2026-09-12) because its rAF loop made scrolling stutter — the
// page now scrolls natively, so locking is just toggling html/body overflow.
// A counter keeps nested/stacked modals honest so the last one to close is the
// one that resumes scrolling.

let lockCount = 0;

export function lockScroll() {
  lockCount += 1;
  if (lockCount === 1) {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
}

export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }
}

// Jump the page to the very top. Used on route changes (so a new page opens at
// the top, not wherever the previous one was) and when tapping the logo while
// already home.
export function scrollToTop(immediate = true) {
  window.scrollTo({ top: 0, behavior: immediate ? "auto" : "smooth" });
}
