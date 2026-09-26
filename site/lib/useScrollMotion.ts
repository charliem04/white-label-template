"use client";

/**
 * The one gate every scroll-linked effect asks before it runs: is this
 * a screen wide enough for pinning and parallax, and does this visitor
 * want motion at all?
 *
 * Entrance animations (see components/Reveal.tsx) do NOT use this —
 * they only check reduced-motion, because a fade is fine on a phone.
 * This gate is specifically for the expensive, scroll-position-linked
 * work: PinnedSteps, Parallax, BandTransition.
 *
 * It returns false on the server and on the first client render, which
 * is deliberate on a statically exported site. The HTML in /out is the
 * un-animated layout — real content, correct order, no dependency on
 * JavaScript for anything a crawler or a reader needs — and the scroll
 * effects attach afterwards as an enhancement. Starting `true` would
 * mean guessing the viewport width during SSR and mismatching hydration
 * on every wrong guess.
 */
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { PIN_MIN_WIDTH } from "./motion";

/**
 * "Should this render completely still?" — the reduced-motion gate, made
 * safe to branch a render tree on.
 *
 * ── WHY NOT useReducedMotion() DIRECTLY ─────────────────────────────
 * Because the server cannot know the answer. Rendering is static here:
 * the HTML in /out is produced once, with no visitor and no matchMedia,
 * so it is always the moving version. framer's useReducedMotion can
 * report true on the very first client render, and a component that
 * branches its tree on it then renders something structurally different
 * from the HTML being hydrated. That is React error #418, six of them on
 * the home page — and React's recovery is to throw the server markup
 * away and re-render the whole tree on the client, which is the most
 * expensive thing that can happen on the one path whose entire purpose
 * is to do less work.
 *
 * Holding false until after mount makes the first client render match
 * the HTML by construction. The stillness then applies on the second
 * render, one frame later.
 *
 * The one frame in between is covered by CSS, not by this hook — see the
 * prefers-reduced-motion block in app/globals.css, which neutralises the
 * inline entrance styles before the first paint. Between the two there
 * is no frame where a reduced-motion visitor sees movement.
 */
export function useStillness(): boolean {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!reduce;
}

export function useScrollMotion(): boolean {
  const reduce = useReducedMotion();
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${PIN_MIN_WIDTH}px)`);
    const sync = () => setWide(mq.matches);
    sync();
    // Rotating a tablet crosses the threshold, so this stays subscribed
    // rather than sampling once on mount.
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return wide && !reduce;
}

/**
 * Which of the three step renderings a visitor gets.
 *
 * ── WHY THIS EXISTS ALONGSIDE useScrollMotion ───────────────────────
 * useScrollMotion answers one question with a boolean, and that boolean
 * is really two facts glued together: the screen is too narrow to pin,
 * and the visitor asked for no motion. Parallax and BandTransition are
 * right not to care which — both mean "do not run". A sequence of steps
 * is the case where it matters, because the two want opposite things:
 *
 *   pinned  wide enough to hold the band still and walk the steps under
 *           the scroll — the desktop treatment
 *   flow    too narrow to pin, but motion is welcome. The page scrolls
 *           normally and the current step follows the reader down the
 *           stack. Nothing is held, nothing is hijacked.
 *   still   the visitor asked for no motion, at any width. No sequence
 *           at all; the band renders once and stays there.
 *
 * Collapsing flow into still is what left phones showing step one lit
 * and the other three grey for the entire section — a sequence with the
 * sequence taken out, which reads as four steps of which only the first
 * matters rather than as four steps in order.
 * ────────────────────────────────────────────────────────────────────
 *
 * Like the hooks above, this reports `still` on the server and on the
 * first client render, so the tree being hydrated is the one the static
 * HTML contains. See the note on useStillness for why that matters.
 */
export type StepMode = "pinned" | "flow" | "still";

export function useStepMode(): StepMode {
  const reduce = useReducedMotion();
  const [wide, setWide] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia(`(min-width: ${PIN_MIN_WIDTH}px)`);
    const sync = () => setWide(mq.matches);
    sync();
    // Rotating a tablet crosses the threshold, so this stays subscribed
    // rather than sampling once on mount.
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!mounted || reduce) return "still";
  return wide ? "pinned" : "flow";
}
