"use client";

/**
 * The full-frame view, shared by the home band and the gallery page so
 * there is one implementation of the keyboard behaviour rather than two
 * that drift.
 *
 * It traps focus in its three controls, restores focus to the tile that
 * opened it, and answers Escape and the arrow keys. A photo grid is not
 * a reason to drop keyboard access.
 */
import { useCallback, useEffect, useRef } from "react";
import type { Photo } from "@/content/types";

export function Lightbox({
  shots,
  at,
  onClose,
  onStep,
}: {
  shots: Photo[];
  /** Index of the open shot, or null when closed */
  at: number | null;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const step = useCallback((d: number) => onStep(d), [onStep]);

  useEffect(() => {
    if (at === null) return;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "Tab") {
        const ring = [closeRef.current, prevRef.current, nextRef.current].filter(
          (el): el is HTMLButtonElement => Boolean(el)
        );
        const i = ring.indexOf(document.activeElement as HTMLButtonElement);
        e.preventDefault();
        ring[(i + (e.shiftKey ? -1 : 1) + ring.length) % ring.length]?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [at, onClose, step]);

  if (at === null) return null;
  const shot = shots[at];
  if (!shot) return null;

  const control =
    "rounded border border-line-dark/20 px-4 py-2.5 font-semibold text-ink-invert transition-colors duration-150 hover:border-accent hover:text-accent active:translate-y-px";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Project photo: ${shot.caption ?? shot.alt}`}
      className="on-deep fixed inset-0 z-50 flex items-center justify-center bg-surface-deep/95 p-[clamp(14px,4vw,48px)]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <figure className="m-0 w-full max-w-[1000px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shot.src}
          alt={shot.alt}
          className="max-h-[78vh] w-full rounded object-contain"
        />
        <figcaption className="mt-4 flex justify-between gap-4 font-mono text-[12px] uppercase tracking-[0.07em] text-ink-invert-soft">
          <span>{shot.caption ?? shot.alt}</span>
          <span>
            {at + 1} / {shots.length}
          </span>
        </figcaption>
      </figure>

      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        className={`absolute right-6 top-6 ${control} px-3.5`}
      >
        Close
      </button>
      <div className="absolute bottom-6 right-6 flex gap-2">
        <button
          ref={prevRef}
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous photo"
          className={control}
        >
          ←
        </button>
        <button
          ref={nextRef}
          type="button"
          onClick={() => step(1)}
          aria-label="Next photo"
          className={control}
        >
          →
        </button>
      </div>
    </div>
  );
}

/**
 * What the grid should actually paint.
 *
 * The grid draws these at ~267 CSS px and crops them to 4:3, but the
 * originals are 1100px wide — the gallery page was pulling 3.4MB to
 * show thumbnails. public/brand/gallery/thumb/ holds a pre-cropped
 * 640x480 of each, which covers a 2x display exactly and is 60%
 * lighter. The lightbox still opens the full-size original.
 *
 * ── WHY THIS IS A LOOKUP AND NOT A STRING REPLACEMENT ───────────────
 *
 * It used to rewrite any /brand/gallery/ path to /brand/gallery/thumb/ and
 * assume the file was there. That held exactly as long as every photo
 * arrived through a developer who remembered to regenerate the
 * thumbnails — and stopped holding the moment the gallery got a CMS,
 * because a photo uploaded at /admin/ lands in /brand/gallery/ with no
 * thumbnail beside it. Every such photo would have rendered as a
 * broken tile: the one failure mode a page that exists to show off the
 * work cannot have, on the newest photo, which is the one somebody
 * just added and will go look at.
 *
 * So the thumbnail is now a fact recorded by scripts/gallery.mjs from
 * what is on disk, rather than a path guessed from a naming rule. No
 * thumbnail means the original is used: heavier, correct, and reported
 * in the build log so the optimisation can be restored deliberately.
 *
 * The eight home-band photos at /brand/work-*.jpg have no thumbnails on
 * purpose — they are already encoded tightly enough that a 640x480
 * re-encode came out fractionally LARGER — and they reach the same
 * branch by the same rule, with nothing special written about them.
 */
function thumbFor(shot: Photo): string {
  return shot.thumb ?? shot.src;
}

/** Tile shared by the band and the page. */
export function GalleryTile({
  shot,
  onOpen,
  className,
}: {
  shot: Photo;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open photo: ${shot.caption ?? shot.alt}`}
      className={`group relative block w-full overflow-hidden rounded border border-line bg-surface-alt p-0 transition-colors duration-200 hover:border-brand active:border-brand-strong ${
        className ?? ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbFor(shot)}
        alt={shot.alt}
        loading="lazy"
        width={640}
        height={480}
        className="aspect-[4/3] w-full object-cover"
      />
      {shot.caption && (
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-deep/90 to-transparent px-3 pb-2.5 pt-6 text-left font-mono text-[11px] uppercase tracking-[0.07em] text-ink-invert group-hover:text-accent">
          {shot.caption}
        </span>
      )}
    </button>
  );
}
