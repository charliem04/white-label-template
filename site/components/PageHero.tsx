import type { ReactNode } from "react";
import type { Photo } from "@/content/types";
import { stagger } from "@/lib/motion";
import { Breadcrumbs } from "./Breadcrumbs";
import { SeamMark } from "./SectionHead";
import { RevealText } from "./RevealText";
import { Reveal } from "./Reveal";
import { Parallax } from "./Parallax";

/**
 * Interior page opener. Deliberately shorter than the home hero, and
 * normally without its own call to action — the home page’s job is to
 * stop you, an interior page’s job is to answer the question you
 * arrived with. The photo sits beside the words rather than under them,
 * so the fold still carries copy on a phone.
 *
 * `actions` is the exception to that, and it is narrow. It exists for
 * the page where the question somebody arrived with IS the action —
 * careers, where every visitor is there to apply and the form is a
 * screen and a half further down. That is the rule holding rather than
 * bending: put the button where the arriving question already points.
 * A page that merely *has* a call to action does not qualify.
 */
export function PageHero({
  path,
  heading,
  lede,
  photo,
  crumbLabel,
  actions,
}: {
  path: string;
  heading: string;
  lede: string;
  photo?: Photo;
  /** For a page the route registry cannot name — see trailFor(). */
  crumbLabel?: string;
  /** See the note above before adding this to another page. */
  actions?: ReactNode;
}) {
  return (
    <section className="on-deep bg-surface-deep text-ink-invert-soft">
      <div className="section pb-12 pt-6 md:pb-16">
        <Breadcrumbs path={path} leafLabel={crumbLabel} />
        <div className="mt-8 grid items-end gap-8 md:grid-cols-[1.15fr_0.85fr]">
          <div>
            <SeamMark className="mb-4" />
            {/* Same opening as a home page band — mark, then the
                heading rising out of its mask — so arriving on an
                interior page from search feels like the same site
                rather than a plainer one. */}
            <RevealText
              as="h1"
              lines={[heading]}
              delay={stagger.loose}
              className="text-display-2 text-ink-invert"
            />
            <Reveal delay={stagger.loose * 2}>
              <p className="mt-4 max-w-[52ch] text-lg">{lede}</p>
            </Reveal>
            {actions && (
              <Reveal delay={stagger.loose * 3}>
                <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                  {actions}
                </div>
              </Reveal>
            )}
          </div>
          {photo && (
            /* The frame already had a fixed height, which is what
               Parallax needs — its drifting layer is absolutely
               positioned and contributes none of its own.

               The accent edge is 3px because that is the weight the
               accent already carries as a rule everywhere else — the
               ruled top on the call card and the leading edge on the
               form confirmation. A fourth
               thickness for the same mark would just be a fourth thing
               to keep in step.

               Only interior heroes get it. The home hero is a separate
               component with the photograph as its full-bleed ground,
               and a frame around a ground is a contradiction. */
            <Parallax
              className="h-[220px] w-full rounded border-[3px] border-accent md:h-[280px]"
              distance={40}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                className="h-full w-full object-cover"
              />
            </Parallax>
          )}
        </div>
      </div>
    </section>
  );
}
