"use client";

/**
 * The full gallery, filterable by the kind of work.
 *
 * The filter is a real set of buttons rather than a URL parameter,
 * because this is browsing, not navigation — nobody wants "roofing
 * photos, page 2" in their back history twelve times over. The count
 * beside each filter is there so a visitor knows whether a category is
 * worth opening before they open it.
 *
 * Each filtered view carries a link to the service it belongs to, which
 * is the actual point of a gallery on a contractor’s site: someone
 * looking at patio covers should be one click from the patio page.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { getGallery, getGalleryCategories } from "@/lib/content";
import type { GalleryCategory } from "@/content/types";
import { Reveal } from "./Reveal";
import { MoreLink } from "./MoreLink";
import { GalleryTile, Lightbox } from "./Lightbox";
import { cascade } from "@/lib/motion";

type Filter = GalleryCategory | "all";

export function GalleryBrowser() {
  const all = getGallery();
  const categories = getGalleryCategories();
  const [filter, setFilter] = useState<Filter>("all");
  const [at, setAt] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const shots = useMemo(
    () => (filter === "all" ? all : all.filter((s) => s.category === filter)),
    [all, filter]
  );

  const open = (i: number) => {
    opener.current = document.activeElement as HTMLElement;
    setAt(i);
  };
  const close = useCallback(() => {
    setAt(null);
    opener.current?.focus();
  }, []);
  // Stepping wraps within the current filter, not the whole set — the
  // arrows should stay inside what the visitor chose to look at.
  const step = useCallback(
    (d: number) =>
      setAt((i) => (i === null ? i : (i + d + shots.length) % shots.length)),
    [shots.length]
  );

  const choose = (f: Filter) => {
    setFilter(f);
    setAt(null);
  };

  const active = categories.find((c) => c.id === filter);
  const chip =
    "rounded border px-4 py-2 font-mono text-[12px] uppercase tracking-[0.09em] transition-colors duration-150 active:translate-y-px";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => choose("all")}
          aria-pressed={filter === "all"}
          className={`${chip} ${
            filter === "all"
              ? "border-ink bg-ink text-ink-invert"
              : "border-line bg-surface text-ink hover:border-brand hover:text-brand"
          }`}
        >
          Everything <span className="opacity-60">{all.length}</span>
        </button>
        {categories.map((c) => {
          const count = all.filter((s) => s.category === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => choose(c.id)}
              aria-pressed={filter === c.id}
              className={`${chip} ${
                filter === c.id
                  ? "border-ink bg-ink text-ink-invert"
                  : "border-line bg-surface text-ink hover:border-brand hover:text-brand"
              }`}
            >
              {c.label} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {active?.service && (
        <p className="mt-6">
          <MoreLink href={active.service}>
            About {active.label.toLowerCase()}
          </MoreLink>
        </p>
      )}

      {/* aria-live so a filter change is announced rather than silently
          swapping the grid under a screen reader. */}
      <p aria-live="polite" className="u-label mt-6">
        Showing {shots.length} {shots.length === 1 ? "photo" : "photos"}
      </p>

      <ul className="mt-4 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3 lg:grid-cols-4">
        {shots.map((s, i) => (
          // Same treatment as the home page's recent-work band: photos
          // settle into focus, everything else rises.
          <Reveal as="li" key={s.src} variant="scale" delay={cascade(i)}>
            <GalleryTile shot={s} onOpen={() => open(i)} />
          </Reveal>
        ))}
      </ul>

      <Lightbox shots={shots} at={at} onClose={close} onStep={step} />
    </>
  );
}
