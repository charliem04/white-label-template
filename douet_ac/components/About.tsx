import { client } from "@/client.config";
import { Reveal, RevealGroup } from "./Reveal";

export function About() {
  const { about } = client;
  return (
    <section id="about" className="border-y border-line bg-surface-alt">
      <div className="section grid items-center gap-12 md:grid-cols-2">
        <Reveal>
          <img
            src={about.photoPath}
            alt="" // TODO(client): describe the real photo, e.g. "The Acme Mechanical crew outside the shop"
            className="aspect-[4/3] w-full rounded border border-line object-cover"
          />
        </Reveal>

        <div>
          <Reveal>
            <h2 className="text-4xl font-bold sm:text-5xl">{about.heading}</h2>
          </Reveal>
          <RevealGroup className="mt-6 space-y-4" step={0.05}>
            {about.body.map((p) => (
              <p key={p.slice(0, 24)} className="leading-relaxed">
                {p}
              </p>
            ))}
          </RevealGroup>

          {/* Shop-door facts: a ruled mono line, not a stat-box band */}
          {about.stats.length > 0 && (
            <Reveal delay={0.1}>
              <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3 border-t border-line pt-5">
                {about.stats.map((s) => (
                  <div key={s.label}>
                    <dt className="u-label">{s.label}</dt>
                    <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink">
                      {s.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
