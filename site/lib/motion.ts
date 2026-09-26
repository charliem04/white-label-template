/**
 * ── MOTION TOKENS ───────────────────────────────────────────────────
 * One vocabulary for every animation on the site. Nothing in
 * components/ writes its own duration, curve or travel distance; it
 * reaches for a name here. That is what keeps thirty animated bands
 * reading as one system instead of thirty improvisations.
 *
 * The registers, in the order you meet them scrolling:
 *
 *   entrance  content arriving in the viewport, once, on the way down
 *   scrub     progress tied to scroll position — reversible, with no
 *             duration of its own, because the finger sets the clock
 *   state     a control answering a pointer: hover, press, nav condense
 *
 * Every value below is a decision with a reason attached. If you change
 * one, change the reason with it.
 * ────────────────────────────────────────────────────────────────────
 */

/**
 * The site curve. Not a new choice — Hero and Reveal have both been
 * running [0.21, 0.65, 0.36, 1] since the first build, and this file
 * records it rather than replacing it with something a hair different.
 *
 * It leaves fast and lands slow, with no overshoot. Overshoot reads as
 * playful, and nothing about a roof replacement is playful; the job of
 * this motion is to make the page feel considered, not lively.
 *
 * Deliberately not the Material default curve, which scripts/check.mjs
 * flags by name as the motion equivalent of reaching for indigo-500.
 * (The literal is spelled out in that rule's definition, not here —
 * writing it in this comment trips the rule on the very file whose job
 * is to document the curve we chose instead.)
 */
export const ease = {
  /** Entrances and state changes. Strong ease-out: the speed is spent up front. */
  out: [0.21, 0.65, 0.36, 1] as const,
  /**
   * Symmetric, for anything that has to run backwards as convincingly
   * as forwards — scrubbed sequences, band crossfades. An ease-out
   * curve played in reverse becomes its opposite, stalling exactly
   * when the eye is following most closely.
   */
  inOut: [0.65, 0, 0.35, 1] as const,
};

/**
 * Three durations, spaced far enough apart to be told apart. A scale
 * with six steps 100ms apart is a scale nobody can hold in their head,
 * and every value in it ends up chosen by coin flip.
 *
 * The rule of thumb underneath: bigger masses move for longer. A button
 * answering a click is quick; a 102px headline is slow.
 */
export const dur = {
  /** 250ms — a control answering the pointer. Fast enough to feel causal. */
  quick: 0.25,
  /** 700ms — the standard band entrance. Long enough to read as motion rather than a jump-cut. */
  base: 0.7,
  /** 1100ms — display type and full-band crossfades. */
  slow: 1.1,
} as const;

/**
 * Travel distances in px. Short travel over a long duration reads as
 * expensive; long travel over a short duration reads as a glitch. These
 * are paired with `dur` above — sm/md with base, lg with slow.
 *
 * All travel is on the Y axis, and all of it rises: content comes up
 * into place. Nothing on this site slides in from the side, which would
 * imply the page has somewhere off-screen it keeps things.
 */
export const travel = {
  /** 14px — list items, table rows, anything appearing in a cascade. */
  sm: 14,
  /** 28px — the standard block: a card, a paragraph, a figure. */
  md: 28,
  /** 48px — a headline line rising out of its mask. */
  lg: 48,
} as const;

/**
 * Gaps between siblings in a cascade. Past about ten items any stagger
 * becomes a queue the reader is waiting in, so `cascade()` below caps
 * the index it multiplies by.
 */
export const stagger = {
  /** 60ms — grid cards and list items. The step Reveal has always used. */
  tight: 0.06,
  /** 80ms — lines within one headline. Slower, because the eye tracks each one. */
  line: 0.08,
  /** 120ms — the few big elements of a band opening: mark, heading, lede, CTA. */
  loose: 0.12,
} as const;

/**
 * Viewport triggers for `whileInView`. The negative margins delay the
 * trigger until the element is properly on screen — firing at the exact
 * moment of intersection means the animation is over before anything
 * has scrolled far enough to be looked at.
 *
 * `once` is true everywhere. Re-animating on the way back up punishes
 * someone for scrolling up to re-read something, which is the moment
 * they are most engaged.
 */
export const viewport = {
  /** Standard: fires once the element is 64px past the bottom edge. */
  standard: { once: true, margin: "-64px" },
  /**
   * For tall elements — a full band, a large figure. Waits until the
   * element is committed to the screen rather than firing when its
   * first pixel appears.
   */
  deep: { once: true, margin: "-15% 0px -10% 0px" },
} as const;

/**
 * Cascade delay for the nth sibling, capped so a long list does not
 * become a waiting room. Ten steps at 60ms is 600ms of stagger, already
 * the longest anyone should be asked to watch a grid fill.
 */
export function cascade(index: number, step: number = stagger.tight): number {
  return Math.min(index, 9) * step;
}

/**
 * Minimum viewport width for pinned and parallax effects, matching
 * Tailwind's `lg`.
 *
 * Below this, scroll-linked motion is not a nicety that degrades — it
 * actively breaks. Mobile browsers resize the viewport as their URL bar
 * hides, which re-runs every scroll calculation mid-gesture; momentum
 * scrolling makes a pinned section feel stuck rather than held; and the
 * point of the phone visit is reaching the call button fast. Small
 * screens get entrances only, and lose nothing they would notice.
 */
export const PIN_MIN_WIDTH = 1024;

/**
 * Ground tones for BandTransition, as Tailwind background utilities.
 *
 * These live here, in a plain module, rather than beside the component
 * that consumes them — and that placement is load-bearing, not tidiness.
 * BandTransition is a "use client" module, and Next turns EVERY export
 * of a client module into a client reference. A server component like
 * Services or OtherServices importing the constant from there does not
 * receive an object at all; it receives a proxy that cannot be
 * serialized, and the build fails at prerender with "Could not find the
 * module … #TONES#light in the React Client Manifest".
 *
 * Values, types and pure functions shared across the boundary belong in
 * a module with no "use client" at the top. Only components need to be
 * over there.
 *
 * Keep both tones of a pair in the same family: the shift has to hold
 * its contrast against the copy at every point of the interpolation.
 * See the note in components/BandTransition.tsx.
 */
export type TonePair = {
  /** The ground the band starts on. Applied to the container. */
  from: string;
  /** The ground it arrives at. Applied to the overlay that fades in. */
  to: string;
};

export const TONES = {
  light: { from: "bg-surface", to: "bg-surface-alt" },
  deep: { from: "bg-surface-deep", to: "bg-surface-deep-alt" },
} satisfies Record<string, TonePair>;
