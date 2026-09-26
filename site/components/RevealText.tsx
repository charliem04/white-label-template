"use client";

/**
 * Headline lines rising out of a mask, one after the next.
 *
 * The effect only works on display type, and it is the reason it exists
 * here rather than as a Reveal variant: at display-1 (up to 102px) a
 * plain fade has nothing to do — the type is so large that opacity
 * alone reads as the page still loading. A masked rise reads as the
 * words being set.
 *
 * ── WHY LINES ARE PASSED IN, NOT MEASURED ───────────────────────────
 * The obvious implementation measures where the browser wrapped the
 * text and masks each visual line. That needs a layout pass before the
 * first paint, it re-runs on every resize, and it fights a clamp()
 * type scale that changes the wrap point continuously rather than at
 * breakpoints. So the caller states the lines instead. It is more
 * typing at the call site and it never desynchronises.
 *
 * A line that wraps on a narrow screen simply rises as one taller
 * block, which is the correct behaviour and needs no special case.
 * ────────────────────────────────────────────────────────────────────
 *
 * ── WHY THE TRIGGER IS ON THE MASK, NOT THE LINE ────────────────────
 * whileInView used to sit on the inner span, and headings across the
 * site silently never appeared — twelve of thirteen routes had at least
 * one.
 *
 * The starting position is the whole problem: the line is translated
 * 112% down, which puts it completely outside the overflow-hidden
 * wrapper. IntersectionObserver intersects against ancestor clips, so a
 * fully-clipped element has no intersecting area, never counts as in
 * view, and never gets told to animate. It stays parked below the mask
 * for good. Whether a given heading escaped came down to whether the
 * wrapper's 0.16em descender padding left a sliver of it showing —
 * which is why the failure looked random rather than total.
 *
 * The observer now watches the wrapper, which is never transformed and
 * therefore always intersects honestly. The wrapper carries the variant
 * label; framer passes it down to the line, which owns the movement.
 *
 * The trap generalises: never hang whileInView on an element whose
 * initial state is "outside the thing that clips it". It also hides
 * from the obvious checks — innerText still returns the words and
 * opacity is still 1, so the text is invisible while every cheap assert
 * passes. Verify with the painted position, not the text content.
 * ────────────────────────────────────────────────────────────────────
 */
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { dur, ease, stagger, viewport } from "@/lib/motion";
import { useStillness } from "@/lib/useScrollMotion";

type TextAs = "h1" | "h2" | "h3" | "p";

export function RevealText({
  lines,
  className,
  delay = 0,
  as: Tag = "h2",
}: {
  /**
   * Each entry is one masked line, revealed `stagger.line` after the
   * one above. Readonly because the headings in client.config are
   * `as const` tuples and this only ever maps over them.
   */
  lines: readonly ReactNode[];
  className?: string;
  delay?: number;
  as?: TextAs;
}) {
  const reduce = useStillness();

  if (reduce) {
    return (
      <Tag className={className}>
        {lines.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </Tag>
    );
  }

  return (
    <Tag className={className}>
      {lines.map((line, i) => (
        // The mask. Descenders on the display face sit below the line
        // box, so the clip box is pushed 0.16em lower and the same
        // amount is pulled back off the bottom margin — without this,
        // overflow-hidden shears the tail off every g, y and p.
        <motion.span
          key={i}
          className="block overflow-hidden pb-[0.16em] mb-[-0.16em]"
          initial="hidden"
          whileInView="visible"
          viewport={viewport.standard}
        >
          <motion.span
            data-mask-line
            className="block"
            variants={{ hidden: { y: "112%" }, visible: { y: "0%" } }}
            transition={{
              duration: dur.slow,
              delay: delay + i * stagger.line,
              ease: ease.out,
            }}
          >
            {line}
          </motion.span>
        </motion.span>
      ))}
    </Tag>
  );
}
