import { client } from "@/client.config";
import { Reveal, RevealGroup } from "./Reveal";

export function Testimonials() {
  if (client.testimonials.length === 0) return null;
  return (
    <section id="testimonials" className="section">
      <Reveal>
        <span className="eyebrow">{client.copy.testimonialsEyebrow}</span>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {client.copy.testimonialsHeading}
        </h2>
      </Reveal>

      <RevealGroup className="mt-10 grid gap-5 md:grid-cols-3" step={0.1}>
        {client.testimonials.map((t) => (
          <figure
            key={t.name}
            className="flex flex-col rounded-xl border border-line bg-surface p-6"
          >
            <svg viewBox="0 0 24 24" className="mb-4 h-6 w-6 text-brand/60" fill="currentColor" aria-hidden>
              <path d="M4 12c0-4 2.7-7 7-8v3c-2.2.7-3.4 2-3.7 4H10v6H4v-5Zm10 0c0-4 2.7-7 7-8v3c-2.2.7-3.4 2-3.7 4H20v6h-6v-5Z" />
            </svg>
            <blockquote className="flex-1 leading-relaxed">“{t.quote}”</blockquote>
            <figcaption className="mt-5 border-t border-line pt-4">
              <div className="font-semibold text-ink">{t.name}</div>
              <div className="text-sm text-ink-faint">{t.detail}</div>
            </figcaption>
          </figure>
        ))}
      </RevealGroup>
    </section>
  );
}
