"use client";

/**
 * The home page’s recent-work band: a curated handful, with the way
 * through to the full set. The photos, the tile and the lightbox all
 * come from elsewhere — this component is only the framing.
 */
import { useCallback, useRef, useState } from "react";
import { client } from "@/client.config";
import { getFeaturedGallery } from "@/lib/content";
import { cascade } from "@/lib/motion";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { MoreLink } from "./MoreLink";
import { GalleryTile, Lightbox } from "./Lightbox";

export function Gallery() {
  const shots = getFeaturedGallery();
  const [at, setAt] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const open = (i: number) => {
    opener.current = document.activeElement as HTMLElement;
    setAt(i);
  };
  const close = useCallback(() => {
    setAt(null);
    opener.current?.focus();
  }, []);
  const step = useCallback(
    (d: number) =>
      setAt((i) => (i === null ? i : (i + d + shots.length) % shots.length)),
    [shots.length]
  );

  // No featured photos yet is a supported state, not an empty band: a
  // heading over nothing reads as a section that failed to load. Hooks
  // above run unconditionally, so returning here is safe.
  if (shots.length === 0) return null;

  return (
    <section id="work" className="band bg-surface">
      <div className="section">
        <SectionHead
          heading={client.copy.galleryHeading}
          lede={client.copy.galleryLede}
        />

        {/* Each tile settles from 1.06 to rest rather than the whole
            grid fading as one block. Photographs are the only content
            on this site that gets the scale variant: it reads as an
            image coming into focus, which is a thing photographs do
            and a thing paragraphs do not. */}
        <ul className="mt-10 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4">
          {shots.map((s, i) => (
            <Reveal as="li" key={s.src} variant="scale" delay={cascade(i)}>
              <GalleryTile shot={s} onOpen={() => open(i)} />
            </Reveal>
          ))}
        </ul>

        <p className="mt-10">
          <MoreLink href="/gallery/">The full gallery</MoreLink>
        </p>
      </div>

      <Lightbox shots={shots} at={at} onClose={close} onStep={step} />
    </section>
  );
}
