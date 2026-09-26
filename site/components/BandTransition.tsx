"use client";

/**
 * A band whose ground shifts tone as you scroll into it, so the seam
 * between two sections arrives gradually instead of as a hard edge.
 *
 * ── THIS IS NOT THE LIGHT-TO-DARK CROSSFADE THAT WAS PLANNED ────────
 * The original idea was to crossfade a band from the light ground to
 * the deep one on scroll. That cannot be made safe. Text on this site
 * is either ink-on-light or invert-on-deep, and halfway through such a
 * crossfade it is neither: dark ink over a half-darkened ground lands
 * somewhere near 2:1, well under the 4.5:1 body minimum, and it sits
 * there for the entire middle of the transition. The alternative —
 * crossfading the text color in step — spends the same failure on the
 * text instead of the ground.
 *
 * So the shift is within one tone family: surface → surface-alt, or
 * surface-deep → surface-deep-alt. Every point in that interpolation
 * holds the same contrast against the copy, because both endpoints
 * already do. The effect is quieter than the plan, and it is the
 * version that can actually ship on a page people have to read.
 * ────────────────────────────────────────────────────────────────────
 *
 * Built as an opacity fade on an overlay rather than an animated
 * background-color: opacity is composited on the GPU, while color is
 * repainted every frame across the full width of the band.
 */
import { useRef } from "react";
import type { ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useScrollMotion } from "@/lib/useScrollMotion";
import type { TonePair } from "@/lib/motion";

/**
 * TONES itself lives in lib/motion.ts, not here. Every export of a
 * "use client" module becomes a client reference, so a server component
 * importing the constant from this file gets an unserializable proxy
 * and the build dies at prerender. The reasoning is written out in full
 * beside the constant.
 */

export function BandTransition({
  children,
  tones,
  className,
  id,
}: {
  children: ReactNode;
  tones: TonePair;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const enabled = useScrollMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    // Complete by the time the band is centred, so the shift belongs to
    // arriving at the section rather than trailing through all of it.
    offset: ["start end", "center center"],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // The ref is attached in both branches on purpose — see the note in
  // Parallax. A useScroll whose target is null does not fail; it starts
  // reporting progress through the whole document instead, and the
  // effect still animates, just against the wrong measurement.
  return (
    <section
      ref={ref}
      id={id}
      className={enabled ? `relative ${tones.from} ${className ?? ""}` : `${tones.from} ${className ?? ""}`}
    >
      {enabled && (
        <motion.span aria-hidden className={`absolute inset-0 ${tones.to}`} style={{ opacity }} />
      )}
      {enabled ? <div className="relative">{children}</div> : children}
    </section>
  );
}
