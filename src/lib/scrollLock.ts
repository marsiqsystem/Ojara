// Scroll lock that actually works with Lenis smooth-scroll.
//
// The site drives scrolling through a Lenis instance that listens on the window,
// so the usual `document.body.style.overflow = "hidden"` does nothing — Lenis
// keeps scrolling the page underneath any open modal. The fix is to stop Lenis
// itself while a modal is open. LenisProvider registers its instance here; modals
// call lockScroll()/unlockScroll(). A counter keeps nested/stacked modals honest
// so the last one to close is the one that resumes scrolling.

type LenisLike = {
  stop: () => void;
  start: () => void;
  scrollTo: (target: number, options?: { immediate?: boolean }) => void;
};

let lenis: LenisLike | null = null;
let lockCount = 0;

export function registerLenis(instance: LenisLike | null) {
  lenis = instance;
  // If something locked before Lenis was ready, honour it now.
  if (lenis && lockCount > 0) lenis.stop();
}

export function lockScroll() {
  lockCount += 1;
  if (lockCount === 1) {
    lenis?.stop();
    // Belt-and-suspenders for the brief window before Lenis mounts, and for any
    // native scroll container (html/body) that isn't Lenis-driven.
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
}

export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    lenis?.start();
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }
}

// Jump the page to the very top. Used on route changes (so a new page opens at
// the top, not wherever the previous one was) and when tapping the logo while
// already home. Goes through Lenis when it's driving the scroll — a bare
// window.scrollTo is overridden by Lenis's own position on the next frame.
export function scrollToTop(immediate = true) {
  if (lenis) {
    lenis.scrollTo(0, { immediate });
  } else {
    window.scrollTo({ top: 0, behavior: immediate ? "auto" : "smooth" });
  }
}
