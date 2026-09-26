"use client";

/**
 * A band that holds still while its contents advance under the scroll.
 *
 * The scroll wheel stops being a way to move down the page and becomes
 * a way to move through one section of it. Used for Process, where the
 * four steps are a sequence in time — the one place on this site where
 * "next" is a real relationship between two blocks rather than just
 * "the thing printed below".
 *
 * ── HOW IT IS BUILT ─────────────────────────────────────────────────
 * No library pinning, no fixed positioning, no scroll hijack. An outer
 * element taller than the screen provides the scroll distance; an inner
 * `position: sticky` frame stays put while that distance is consumed.
 * The browser does the pinning natively, which means it survives resize,
 * zoom, find-in-page and back-button restoration without a single
 * recalculation of ours.
 *
 * All this component contributes is: how tall the track is, and which
 * step the current scroll position corresponds to.
 * ────────────────────────────────────────────────────────────────────
 *
 * ── THE CONTRACT ────────────────────────────────────────────────────
 * `children` is a render prop taking the active step index, whether the
 * band is pinned, and a function that scrolls to a given step.
 *
 *   active >= 0, pinned    the band is held; the scroll walks the steps
 *   active >= 0, unpinned  the page scrolls normally and the current
 *                          step follows the reader down the stack
 *   active === -1          no sequence at all; render the band once
 *
 * `pinned` exists because the two moving cases want the same emphasis
 * and different geometry. Pinned, the band is standing still, so the
 * current step can afford to grow. Unpinned, the reader is moving, and
 * a card that changes size as it passes the middle of the screen shifts
 * everything below it under the thumb that is scrolling — the same
 * animation, minus the part that fights the reader.
 *
 * The third argument, `goTo`, is what makes the steps navigable rather
 * than merely observable: it scrolls the page to the position at which
 * the requested step becomes current. It works in all three modes, so a
 * caller can wire a click to it without first asking which one is
 * running — see the note on the function itself for the geometry.
 *
 * -1 is now the reduced-motion rendering only. It used to be what
 * phones got too, which is what left them showing step one lit and the
 * other three grey for the whole band.
 * ────────────────────────────────────────────────────────────────────
 *
 * ── WHAT THE CALLER OWES ────────────────────────────────────────────
 * In the unpinned case there is no scroll track to measure — the steps
 * are ordinary boxes in the page — so this component has to find them.
 * It looks for `[data-step]` inside itself, in document order. A caller
 * that renders a sequence without tagging the steps gets -1 behaviour
 * and no error, which is the safe way to be wrong.
 * ────────────────────────────────────────────────────────────────────
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useStepMode } from "@/lib/useScrollMotion";
import { scrollToPosition } from "./SmoothScroll";

export function PinnedSteps({
  count,
  children,
  className,
  /**
   * Screens of scrolling spent on each step. Below about 0.45 the steps
   * flick past faster than they can be read; past about 0.8 the visitor
   * starts to wonder whether the page has stopped working. 0.6 is a
   * comfortable beat — roughly a second of unhurried scrolling per step.
   */
  scrollPerStep = 0.6,
}: {
  count: number;
  children: (active: number, pinned: boolean, goTo: (i: number) => void) => ReactNode;
  className?: string;
  scrollPerStep?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mode = useStepMode();
  const [active, setActive] = useState(0);

  /**
   * ── WHY THIS MEASURES THE TRACK ITSELF ──────────────────────────────
   * This was framer's useScroll with target/offset, and it was silently
   * wrong. The gate below starts false, so the first render returned the
   * un-pinned tree — which did not carry the ref. useScroll's effect ran
   * against a null target, and rather than failing it fell back to
   * tracking progress through the whole document. The steps still
   * advanced, which is what made it hard to see: they were advancing on
   * page position instead of band position, so the band opened already
   * on step 2 and never reached step 4.
   *
   * Reading the track's own rect on each frame has no such failure mode.
   * -rect.top is how far into the track we have scrolled; the span is
   * the part of it that is not the sticky frame. Both are read live, so
   * images loading in above, a resize, or a font swap simply produce a
   * correct answer on the next frame instead of a stale one forever.
   * ────────────────────────────────────────────────────────────────────
   */
  useEffect(() => {
    if (mode !== "pinned") return;
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      // The track is one screen taller than the travel it provides.
      const span = rect.height - window.innerHeight;
      if (span <= 0) return;
      const progress = Math.min(1, Math.max(0, -rect.top / span));
      // Each step owns an equal share. Clamped at the top because
      // progress reaches exactly 1 on the last pixel, which would
      // otherwise index one past the final step for a frame.
      const next = Math.min(count - 1, Math.floor(progress * count));
      setActive((current) => (current === next ? current : next));
    };
    // Coalesced to one measurement per frame: Lenis emits a scroll
    // event per animation frame while decelerating, and getBoundingClientRect
    // is a layout read we do not want to do twice for the same paint.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mode, count]);

  /**
   * ── THE UNPINNED SEQUENCE ───────────────────────────────────────────
   * Same question as above — which step is the current one — asked of a
   * band that is not being held still. There is no synthetic track to
   * divide up, so the steps supply one: the box that encloses all of
   * them is the distance, and the middle of the screen is the playhead
   * running down it. Equal shares again, exactly as when pinned.
   *
   * ── WHY NOT "WHICHEVER STEP IS NEAREST THE MIDDLE" ──────────────────
   * That was the first version, and it is the obvious one — but it
   * quietly cannot express half the sequence. Between 640 and 1024 the
   * steps are two-up, so 1 and 2 share a vertical centre and so do 3
   * and 4. Nearest-to-centre ties on every row and the tie-break picks
   * the earlier index every time, so a tablet walked 1 → 3 and the
   * other two steps were never current at any scroll position. It
   * measured the layout when the thing being sequenced is the list.
   *
   * Position along the whole run has no such blind spot: four equal
   * shares are four equal shares whether the cards are in one column,
   * two, or four. Stacked on a phone each card is about a quarter of
   * the run, so the share that is current is the card in the middle of
   * the screen — the same answer nearest-to-centre was reaching for,
   * arrived at in a way that survives the row wrapping.
   *
   * It is also direction-free. A threshold ("has this step crossed 40%
   * of the viewport") has to be tuned for scrolling down and then lights
   * the wrong step on the way back up. A position maps to the same step
   * whichever way the reader arrived at it, so the sequence runs
   * backwards exactly as well as forwards.
   *
   * Clamped at both ends, so above the run step one is current and below
   * it step four is. There is no scroll position where nothing is lit.
   * ────────────────────────────────────────────────────────────────────
   */
  useEffect(() => {
    if (mode !== "flow") return;
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const steps = el.querySelectorAll<HTMLElement>("[data-step]");
      if (!steps.length) return;
      // The run is the union of the steps rather than the band, so the
      // heading above them and anything below is not counted as travel.
      // One pass, one rect read per step — a NodeList is not spreadable
      // at this compile target anyway.
      let top = Infinity;
      let bottom = -Infinity;
      steps.forEach((step) => {
        const rect = step.getBoundingClientRect();
        if (rect.top < top) top = rect.top;
        if (rect.bottom > bottom) bottom = rect.bottom;
      });
      const span = bottom - top;
      if (span <= 0) return;
      const progress = Math.min(1, Math.max(0, (window.innerHeight / 2 - top) / span));
      const next = Math.min(steps.length - 1, Math.floor(progress * steps.length));
      setActive((current) => (current === next ? current : next));
    };
    // Same coalescing as the pinned path, and for the same reason: one
    // layout read per paint, not one per scroll event.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mode, count]);

  /**
   * ── JUMPING TO A STEP ───────────────────────────────────────────────
   * Both measuring effects above answer "given a scroll position, which
   * step is current". This is that question run backwards: given a step,
   * what scroll position makes it current. Same two geometries, same
   * two formulas solved the other way, so a jump can never disagree with
   * what the scroll listener will report on arrival.
   *
   * Pinned, the destination is inside the synthetic track:
   *
   *     progress = -rect.top / span        (the listener)
   *     scrollY' = scrollY + rect.top + progress · span   (this)
   *
   * Aimed at the MIDDLE of the step's share rather than its leading
   * edge. Landing on a boundary means a pixel of drift — a rounded
   * scroll position, a font finishing loading, a rubber-band on a
   * trackpad — flips to the neighbouring step, so the band would
   * occasionally settle one off from the card that was clicked.
   *
   * Unpinned, there is no track and the card itself is the target:
   * centred in the viewport, because the middle of the screen is the
   * playhead the flow measurement uses.
   *
   * ── WHY THE DURATION GROWS WITH THE DISTANCE ────────────────────────
   * The point of this on a pinned band is that the reader SEES the
   * intervening steps go by — that is the sequence stating itself. A
   * fixed duration makes one step feel sluggish and three feel like a
   * cut. Scaling keeps the per-step pace roughly even, and the cap stops
   * a four-step jump becoming something the reader waits out.
   */
  const goTo = useCallback(
    (target: number) => {
      const el = ref.current;
      if (!el) return;
      const index = Math.min(count - 1, Math.max(0, target));

      // Long enough to read as travel, short enough to stay a control.
      const distance = Math.abs(index - active) || 1;
      const duration = Math.min(1.8, 0.5 + 0.32 * distance);

      if (mode === "pinned") {
        const rect = el.getBoundingClientRect();
        const span = rect.height - window.innerHeight;
        // A viewport taller than the track has no travel to distribute,
        // and dividing by it would send the page to NaN.
        if (span <= 0) return;
        const progress = (index + 0.5) / count;
        scrollToPosition(window.scrollY + rect.top + progress * span, duration);
        return;
      }

      const steps = el.querySelectorAll<HTMLElement>("[data-step]");
      if (!steps.length) return;

      // The union of the steps, measured exactly as the flow listener
      // measures it — NOT the clicked card's own box.
      //
      // Centring the card in the viewport is the obvious move and it is
      // wrong at any width where the cards share a row. Between 640 and
      // 1024 they are two-up, so steps 3 and 4 have the same vertical
      // centre: centring either one puts the playhead three quarters of
      // the way down the run, which the listener reads as step 4. A
      // tablet could reach steps 1 and 4 and nothing else.
      //
      // The listener divides the run into equal shares by position, for
      // the reasons written above it, so the jump has to speak the same
      // language:
      //
      //     progress = (innerHeight / 2 - top) / span     (the listener)
      //     scrollY' = scrollY + top - innerHeight / 2
      //                + progress · span                  (this)
      let top = Infinity;
      let bottom = -Infinity;
      steps.forEach((step) => {
        const rect = step.getBoundingClientRect();
        if (rect.top < top) top = rect.top;
        if (rect.bottom > bottom) bottom = rect.bottom;
      });
      const span = bottom - top;
      if (span <= 0) return;

      const progress = (index + 0.5) / steps.length;
      scrollToPosition(
        window.scrollY + top - window.innerHeight / 2 + progress * span,
        duration,
      );
    },
    [mode, count, active],
  );

  const pinned = mode === "pinned";

  return (
    <div
      ref={ref}
      className={className}
      // One screen for the frame itself, plus the travel the steps need.
      // Only the pinned band needs the extra height; unpinned, the band
      // is exactly as tall as its contents, like every other band.
      style={pinned ? { height: `calc(100vh + ${count * scrollPerStep * 100}vh)` } : undefined}
    >
      {pinned ? (
        // Deliberately not overflow-hidden. A frame exactly one screen
        // tall will be shorter than its contents on a laptop with a
        // short viewport, and clipping there silently removes the last
        // step from a sequence whose whole point is that there are four
        // of them. Overflowing is visible and survivable; clipping is
        // neither.
        <div className="sticky top-0 flex h-screen items-center">
          {children(active, true, goTo)}
        </div>
      ) : (
        children(mode === "flow" ? active : -1, false, goTo)
      )}
    </div>
  );
}
