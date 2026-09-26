"use client";

/**
 * Momentum scrolling, site-wide. Mounted once in app/layout.tsx.
 *
 * Lenis intercepts the wheel and gives the page a short deceleration
 * instead of the browser's instant line-jump. It renders nothing.
 *
 * ── WHAT IT DELIBERATELY DOES NOT TOUCH ─────────────────────────────
 * Touch scrolling. Lenis ships with `syncTouch` off and it stays off:
 * a finger on a screen already has momentum from the OS, and layering a
 * second inertia model on top of it is the single most common way these
 * libraries make a phone feel broken. So this affects a mouse wheel and
 * a trackpad, and nothing else.
 *
 * Keyboard scrolling, find-in-page, and anchor jumps all still work —
 * `anchors: true` routes in-page # links through Lenis so they ease
 * instead of teleporting, which is the one behaviour the CSS rule below
 * used to provide.
 * ────────────────────────────────────────────────────────────────────
 *
 * ── ON scroll-behavior: smooth ──────────────────────────────────────
 * app/globals.css sets `html { scroll-behavior: smooth }`. That rule and
 * Lenis fight: the browser animates the same scroll position Lenis is
 * writing to every frame, and the result stutters.
 *
 * Rather than delete the rule, this turns it off at runtime and puts it
 * back on cleanup. The rule is then still doing its job for the two
 * cases Lenis is absent from — no JavaScript at all, and a visitor who
 * asked for reduced motion — instead of the stylesheet quietly
 * depending on a component having mounted.
 * ────────────────────────────────────────────────────────────────────
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import Lenis from "lenis";

/** Module-scoped so the route-change effect below can reach the instance. */
let lenis: Lenis | null = null;

export function SmoothScroll() {
  const reduce = useReducedMotion();
  const pathname = usePathname();

  useEffect(() => {
    if (reduce) return;

    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    lenis = new Lenis({
      // 1.1s to come to rest. Long enough to read as deceleration,
      // short enough that a visitor scanning for the phone number is
      // never waiting on the page to catch up with them.
      duration: 1.1,
      // The site curve, expressed as the easing Lenis wants: a function
      // over 0..1 rather than a bezier tuple. Matched by shape to
      // ease.out — all the speed spent early, no overshoot.
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      // See the note above: the finger keeps the platform's own physics.
      syncTouch: false,
      // Lenis drives its own requestAnimationFrame loop.
      autoRaf: true,
      // In-page # links ease to their target through Lenis.
      //
      // The offset is the sticky header. Without it every anchor on the
      // site lands with the top of its target tucked underneath the nav
      // — the heading you jumped to is the part you cannot see. 96px
      // clears the 70-78px bar and leaves a little air.
      //
      // Lenis does not read CSS scroll-margin, so this has to be told
      // to it here; the matching rule in globals.css covers the native
      // path for when Lenis is not running.
      anchors: { offset: -96 },
    });

    return () => {
      lenis?.destroy();
      lenis = null;
      root.style.scrollBehavior = previousBehavior;
    };
  }, [reduce]);

  // A client-side route change has to land at the top of the new page.
  // Next resets window scroll itself, but Lenis holds its own idea of
  // the current position and would otherwise ease back to where the
  // previous page was left.
  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true });
  }, [pathname]);

  return null;
}

/**
 * Programmatic scrolling for the rest of the app — the sticky CTA's
 * "back to top", say. Falls through to the native call when Lenis is
 * not running, so callers never have to ask whether it is.
 */
/**
 * Scroll to an absolute document position, over a stated duration.
 *
 * Separate from scrollToTarget because the caller that needs this — the
 * pinned process band — is not aiming at an element. Its destination is
 * a position inside a synthetic scroll track, and the distance is the
 * point rather than an implementation detail: travelling three steps
 * has to take visibly longer than travelling one, or the band arrives
 * without the reader seeing it pass through anything.
 *
 * Lenis takes seconds. The native fallback cannot be given a duration
 * at all, which is fine — it is the path for a visitor who has either
 * no JavaScript-driven scrolling or an explicit reduced-motion
 * preference, and in the second case an instant jump is the correct
 * answer rather than a degraded one.
 */
export function scrollToPosition(top: number, duration?: number) {
  if (lenis) {
    lenis.scrollTo(top, duration === undefined ? undefined : { duration });
    return;
  }
  window.scrollTo({ top, behavior: "smooth" });
}

export function scrollToTarget(target: string | number | HTMLElement) {
  if (lenis) {
    lenis.scrollTo(target);
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: "smooth" });
  } else if (typeof target !== "string") {
    target.scrollIntoView({ behavior: "smooth" });
  } else {
    document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
  }
}
