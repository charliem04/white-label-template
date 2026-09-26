"use client";

/**
 * Scroll-reveal wrapper — the workhorse. Content rises into place the
 * first time it enters the viewport. Pass `delay` (seconds) to stagger
 * siblings, or use <RevealGroup> for cascade on lists and grids.
 * Respects prefers-reduced-motion (renders static).
 *
 * Timing, travel and curve all come from lib/motion.ts. Nothing here
 * writes a number of its own.
 *
 * `as` picks the element it renders. It exists because the default div
 * is invalid inside a list: `<ul><Reveal><li>…` emits `<ul><div><li>`,
 * which axe flags as a broken list and which strips the list semantics
 * a screen reader announces ("list, 8 items"). Inside a <ul>, <ol> or
 * <dl>, pass the element the parent expects and move the <li> markup
 * onto the Reveal itself.
 *
 * ── ON THE VARIANT LIST ─────────────────────────────────────────────
 * There is no `blur` variant, though it was in the plan. Animating a
 * filter forces the compositor to re-rasterize the layer every frame,
 * and the elements that would want it here are the big ones — band
 * headings, full-width figures — which is exactly where the cost lands
 * hardest and where a mid-range phone drops frames. `scale` gets the
 * same "settling into focus" read for the price of a transform.
 * ────────────────────────────────────────────────────────────────────
 */
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { dur, ease, stagger, travel, viewport } from "@/lib/motion";
import { useStillness } from "@/lib/useScrollMotion";

type RevealAs = "div" | "li" | "figure";

/**
 * How the content arrives.
 *
 *   rise    the default block entrance — 28px up, for a card or a paragraph
 *   riseSm  14px, for items in a cascade where the full travel would
 *           read as the row jostling rather than arriving
 *   fade    opacity only, for content whose position is already load-
 *           bearing (a figure inside a fixed grid cell, say)
 *   scale   settles from 1.06 down to rest, for photography — it reads
 *           as the image coming into focus rather than sliding
 */
type RevealVariant = "rise" | "riseSm" | "fade" | "scale";

const VARIANTS: Record<RevealVariant, { from: Record<string, number>; to: Record<string, number> }> = {
  rise: { from: { opacity: 0, y: travel.md }, to: { opacity: 1, y: 0 } },
  riseSm: { from: { opacity: 0, y: travel.sm }, to: { opacity: 1, y: 0 } },
  fade: { from: { opacity: 0 }, to: { opacity: 1 } },
  scale: { from: { opacity: 0, scale: 1.06 }, to: { opacity: 1, scale: 1 } },
};

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
  variant = "rise",
  duration = dur.base,
  deep = false,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: RevealAs;
  variant?: RevealVariant;
  /** Override only for content whose mass genuinely differs — see dur in lib/motion.ts. */
  duration?: number;
  /** Use the later trigger for tall elements that would otherwise fire off-screen. */
  deep?: boolean;
}) {
  const reduce = useStillness();
  const Motion = motion[as];
  const Plain = as;

  if (reduce) return <Plain className={className}>{children}</Plain>;

  const { from, to } = VARIANTS[variant];
  return (
    <Motion
      className={className}
      initial={from}
      whileInView={to}
      viewport={deep ? viewport.deep : viewport.standard}
      transition={{ duration, delay, ease: ease.out }}
    >
      {children}
    </Motion>
  );
}

/** Cascade children with a fixed stagger step. */
export function RevealGroup({
  children,
  step = stagger.tight,
  className,
  itemClassName,
  variant = "riseSm",
}: {
  children: ReactNode[];
  step?: number;
  className?: string;
  itemClassName?: string;
  variant?: RevealVariant;
}) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        // Capped inside Reveal's caller rather than here so a group of
        // forty still finishes arriving in well under a second.
        <Reveal key={i} delay={Math.min(i, 9) * step} className={itemClassName} variant={variant}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
