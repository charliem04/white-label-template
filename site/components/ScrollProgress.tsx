"use client";

/**
 * Hairline reading-progress bar. Ink, not accent — quiet by design.
 *
 * Gated on useStillness rather than useReducedMotion: branching the
 * render on useReducedMotion directly makes the first client render
 * differ from the exported HTML (React #418). See lib/useScrollMotion.ts.
 */
import { motion, useScroll, useSpring } from "framer-motion";
import { useStillness } from "@/lib/useScrollMotion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    restDelta: 0.001,
  });
  const still = useStillness();
  if (still) return null;
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-px origin-left bg-ink"
      style={{ scaleX }}
    />
  );
}
