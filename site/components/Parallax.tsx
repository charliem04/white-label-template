"use client";

/**
 * Scroll-linked depth: the child drifts slower than the page, so a
 * photograph sits behind the plane of the text instead of on it.
 *
 * Used on the hero and on the large job photographs. Deliberately not
 * used on anything a visitor reads or clicks — parallaxed body copy is
 * copy that moves while you are trying to read it.
 *
 * ── THE GAP PROBLEM, AND WHY THE CHILD IS OVERSIZED ─────────────────
 * Translating a child inside its own frame exposes the frame's edge at
 * both ends of the range. The usual fix is telling every call site to
 * make its image taller and hope it remembers. Instead the inner layer
 * is grown by exactly the travel distance and offset by half of it, so
 * the drift is spent entirely inside the overflow and no caller has to
 * think about it. `overflow-hidden` on the frame is what clips it.
 * ────────────────────────────────────────────────────────────────────
 *
 * ── THE FRAME MUST HAVE ITS OWN HEIGHT ──────────────────────────────
 * The drifting layer is absolutely positioned, so it contributes no
 * height to the frame. Wrapping an <img> that was sizing its own
 * container collapses that container to nothing. Give the frame a
 * height or an aspect ratio — `aspect-[820/880]`, `h-full` inside a
 * positioned parent — and let the child fill it with object-cover.
 * ────────────────────────────────────────────────────────────────────
 *
 * Desktop only, and off under prefers-reduced-motion — see
 * lib/useScrollMotion.ts for why that gate is not just politeness.
 */
import { useRef } from "react";
import type { ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useScrollMotion } from "@/lib/useScrollMotion";

export function Parallax({
  children,
  className,
  /**
   * Total px of drift across the whole pass through the viewport.
   * 60-80 reads as depth; past about 120 it reads as the image being
   * dragged, and the eye starts watching the motion instead of the roof.
   */
  distance = 72,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useScrollMotion();

  // Hooks cannot be called conditionally, so the scroll subscription is
  // always set up; only the resulting style is withheld when the gate
  // is closed.
  const { scrollYProgress } = useScroll({
    target: ref,
    // "the moment its top meets the bottom edge" → "the moment its
    // bottom leaves the top edge": the element's full pass across the
    // screen, so the drift is spread over the whole visible life.
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-distance / 2, distance / 2]);

  /**
   * The ref is attached in BOTH branches, and that is load-bearing.
   *
   * The gate starts false, so the first render is the un-enhanced one.
   * If that render omitted the ref, useScroll's effect would run against
   * a null target — and it does not fail when it cannot find one, it
   * quietly falls back to progress through the whole document. The
   * result still moves, which is what makes it so easy to ship: the
   * image drifts, just in response to the wrong thing entirely.
   * PinnedSteps had exactly this bug and it took a scroll trace to see.
   */
  return (
    <div ref={ref} className={enabled ? `relative overflow-hidden ${className ?? ""}` : className}>
      {enabled ? (
        <motion.div
          className="absolute inset-x-0"
          style={{
            y,
            top: -distance / 2,
            height: `calc(100% + ${distance}px)`,
          }}
        >
          {children}
        </motion.div>
      ) : (
        children
      )}
    </div>
  );
}
