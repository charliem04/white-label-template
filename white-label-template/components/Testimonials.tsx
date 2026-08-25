import { client } from "@/client.config";
import { Reveal, RevealGroup } from "./Reveal";

export function Testimonials() {
  if (client.testimonials.length === 0) return null;
  return (
    <section id="testimonials" className="section">
      <Reveal>
        <h2 className="text-4xl font-bold sm:text-5xl">
          {client.copy.testimonialsHeading}
        </h2>
      </Reveal>

      {/* Quiet, ruled columns — no quote-mark icons, no card chrome */}
      <RevealGroup
        className="mt-10 grid gap-x-10 gap-y-8 border-t border-line pt-8 md:grid-cols-3"
        step={0.08}
      >
        {client.testimonials.map((t) => (
          <figure key={t.name}>
            <blockquote className="leading-relaxed text-ink">
              “{t.quote}”
            </blockquote>
            <figcaption className="u-label mt-4">
              {t.name} · {t.detail}
            </figcaption>
          </figure>
        ))}
      </RevealGroup>
    </section>
  );
}
