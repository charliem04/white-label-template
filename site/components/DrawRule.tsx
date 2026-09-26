"use client";

/**
 * A rule that draws itself left to right when it enters view.
 *
 * The site already separates every band with hairlines and ruled tops
 * (see Process, SectionHead). This animates that existing mark rather
 * than adding a new one — the rule was always there, it now arrives
 * with the heading it belongs to instead of being there before it.
 *
 * scaleX from a left origin, so the whole thing is one composited
 * transform: no width animation, nothing that forces layout per frame.
 *
 * Purely decorative, so it is aria-hidden. Do not use it to convey
 * progress or state — it carries no meaning a reader would miss.
 */
import { motion } from "framer-motion";
import { dur, ease, viewport } from "@/lib/motion";
import { useStillness } from "@/lib/useScrollMotion";

export function DrawRule({
  className = "h-px bg-line",
  delay = 0,
}: {
  /** Height and color come from the caller so a gold 3px top and a light hairline share this component. */
  className?: string;
  delay?: number;
}) {
  const reduce = useStillness();

  if (reduce) return <span aria-hidden className={`block w-full ${className}`} />;

  return (
    <motion.span
      aria-hidden
      className={`block w-full origin-left ${className}`}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={viewport.standard}
      transition={{ duration: dur.base, delay, ease: ease.out }}
    />
  );
}
