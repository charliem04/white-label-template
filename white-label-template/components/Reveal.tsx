"use client";

/**
 * Scroll-reveal wrapper. Fades content into place the first time it
 * enters the viewport. Pass `delay` (seconds) to stagger siblings, or
 * use <RevealGroup> for automatic cascade on grids.
 * Respects prefers-reduced-motion (renders static).
 */
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: [0.21, 0.65, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Cascade children with a fixed stagger step. */
export function RevealGroup({
  children,
  step = 0.08,
  className,
  itemClassName,
}: {
  children: ReactNode[];
  step?: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <Reveal key={i} delay={i * step} className={itemClassName}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
