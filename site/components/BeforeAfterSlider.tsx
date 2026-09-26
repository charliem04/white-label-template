"use client";

/**
 * Two photographs in one frame, revealed against each other by a
 * draggable divider.
 *
 * ── WHY THIS EXISTS BESIDE BeforeAfter, NOT INSTEAD OF IT ───────────
 * components/BeforeAfter.tsx argues, at length and correctly, against
 * exactly this control: a slider shows half of each photograph at a
 * time and charges a deliberate interaction for the rest. That
 * reasoning holds for before/after case studies, where an adjuster or a
 * spouse needs both states legible in one glance, and it is why the
 * case study pages are untouched.
 *
 * It does not hold here. This pair is not damage and repair — it is
 * copper before and after the shop forms it, and the point is the
 * transformation rather than the two end states. A divider you push
 * across is the control that shows flat stock becoming a folded hip.
 *
 * Worth being straight about the limit: the two frames are not
 * registered. They are the same material in the same shop at two
 * stages, not one locked-off camera position photographed twice, so the
 * wipe reads as "here is the next stage" rather than as a seamless
 * morph. That is honest for what this band claims — we form our own
 * metal — and it is the reason the labels are always on screen instead
 * of relying on the seam to explain itself.
 * ────────────────────────────────────────────────────────────────────
 *
 * ── THE OBJECTIONS THAT DO SURVIVE, AND WHAT ANSWERS THEM ───────────
 * A horizontal drag on a phone competes with a vertical scroll, and a
 * bespoke drag handle is invisible to a keyboard.
 *
 * Both are answered by making the control a real <input type="range">
 * stretched over the frame at zero opacity, rather than hand-written
 * pointer maths. It is draggable by mouse and finger, focusable, and
 * already understood by every screen reader and every keyboard —
 * arrows nudge, Home and End slam to either end, at no cost.
 *
 * `touch-action: pan-y` is what keeps the phone honest: a horizontal
 * drag moves the divider, and a vertical one scrolls the page straight
 * past it, because the browser resolves that gesture conflict itself
 * and does it better than we would.
 * ────────────────────────────────────────────────────────────────────
 *
 * With no JavaScript the divider sits where it was rendered and both
 * photographs are half visible, which still reads as a comparison.
 * Nothing here is required to understand the band.
 */
import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import type { Photo } from "@/content/types";
import { useStillness } from "@/lib/useScrollMotion";

export function BeforeAfterSlider({
  before,
  after,
  className,
  /**
   * Where the divider starts, as a percentage from the left. 100 is the
   * seam pushed fully right, which is the "before" frame filling the
   * box — the state the exported HTML is rendered in.
   */
  start = 100,
}: {
  before: Photo;
  after: Photo;
  className?: string;
  start?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useStillness();
  const [pos, setPos] = useState(start);
  /** Set once someone touches the control; scroll stops driving it. */
  const [manual, setManual] = useState(false);

  /**
   * The wipe runs on scroll position: flat stock as the figure enters
   * from the bottom of the screen, fully formed by the time it reaches
   * the middle. Reading the band top to bottom performs the shop
   * process, which is the argument this band exists to make — nobody
   * has to notice a control to get it.
   *
   * The control is still there and still wins. The first drag or
   * keypress sets `manual` and scroll stops driving, because a slider
   * that snaps back to wherever the page thinks it should be is a
   * slider that feels broken.
   */
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (manual || still) return;
    // Rounded to whole percent so this re-renders about a hundred times
    // across the whole wipe rather than once per frame.
    const next = Math.round(100 - p * 100);
    setPos((current) => (current === next ? current : next));
  });

  /**
   * A visitor who asked for reduced motion gets no wipe, so leaving the
   * seam parked hard right would leave them looking at flat stock with
   * no hint the formed piece exists. Half and half shows both frames at
   * once, which is what the non-slider BeforeAfter does for the same
   * reason.
   */
  useEffect(() => {
    if (still && !manual) setPos(50);
  }, [still, manual]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className ?? ""}`}>
      {/* The "before" is the ground; the "after" is clipped over it, so
          the divider position is a single inset on one element and the
          two never disagree about where the seam is. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={before.src}
        alt={before.alt}
        width={before.width}
        height={before.height}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={after.src}
        alt={after.alt}
        width={after.width}
        height={after.height}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
      />

      <span className="u-label absolute left-3 top-3 rounded bg-surface-deep/70 px-2 py-1 text-ink-invert">
        Before
      </span>
      <span className="u-label absolute right-3 top-3 rounded bg-surface-deep/70 px-2 py-1 text-ink-invert">
        After
      </span>

      {/* The seam, and a grip on it. Decorative — the range input below
          is the actual control — so neither swallows a pointer.

          They are siblings rather than parent and child because they
          want different behaviour at the ends of the track. The line
          belongs exactly on the clip boundary and can run off the edge,
          where it is a hairline nobody misses. The grip is 36px across
          and would spend half of itself outside the frame, so its
          position is clamped to stay wholly inside — which matters now
          that the wipe parks itself at 0 after scrolling, making an end
          state the resting state rather than an edge case. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-[2px] bg-accent"
        style={{ left: `calc(${pos}% - 1px)` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent font-mono text-[13px] font-semibold text-accent-ink"
        style={{ left: `clamp(20px, ${pos}%, calc(100% - 20px))` }}
      >
        ⇔
      </span>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pos}
        onChange={(e) => {
          setManual(true);
          setPos(Number(e.target.value));
        }}
        // Pointer down counts as taking over even before the value
        // moves, so the seam does not keep drifting under a finger that
        // is already holding it.
        onPointerDown={() => setManual(true)}
        aria-label="Reveal the formed copper. Drag, or use the arrow keys."
        // Zero opacity rather than sr-only: it has to stay the size of
        // the frame to be draggable across it.
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        style={{ touchAction: "pan-y" }}
      />
    </div>
  );
}
