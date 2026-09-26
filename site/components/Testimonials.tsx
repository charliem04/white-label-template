import { client } from "@/client.config";
import { stagger } from "@/lib/motion";
import { RevealGroup } from "./Reveal";
import { SectionHead } from "./SectionHead";

/**
 * Quiet, ruled columns — no quote-mark icons, no card chrome, no stars
 * nobody can verify. Real quotes only: `testimonials: []` in
 * client.config hides the band entirely, which is the correct state
 * until the client supplies quotes cleared for the site.
 */
export function Testimonials() {
  if (client.testimonials.length === 0) return null;
  return (
    <section id="testimonials" className="band bg-surface">
      <div className="section">
        <SectionHead heading={client.copy.testimonialsHeading} />

        <RevealGroup
          className="mt-10 grid gap-x-10 gap-y-8 border-t border-line pt-8 md:grid-cols-3"
          step={stagger.line}
        >
          {client.testimonials.map((t) => (
            <figure key={t.name} className="m-0">
              <blockquote className="m-0 text-ink">“{t.quote}”</blockquote>
              <figcaption className="u-label mt-4">
                {t.name} · {t.detail}
              </figcaption>
            </figure>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
