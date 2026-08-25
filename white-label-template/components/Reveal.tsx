"use client";

/**
 * Scroll-reveal wrapper. Short-travel fade (12px, 400ms) the first time
 * content enters the viewport. Pass `delay` (seconds) to stagger
 * siblings, or use <RevealGroup> for cascade on lists/grids.
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
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px" }}
      transition={{ duration: 0.4, delay, ease: [0.21, 0.65, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Cascade children with a fixed stagger step. */
export function RevealGroup({
  children,
  step = 0.06,
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
