import { client } from "@/client.config";
import { Reveal, RevealGroup } from "./Reveal";

export function About() {
  const { about } = client;
  return (
    <section id="about" className="bg-surface-alt">
      <div className="section grid items-center gap-12 md:grid-cols-2">
        <Reveal>
          <img
            src={about.photoPath}
            alt="" // TODO(client): describe the real photo, e.g. "The Acme Mechanical crew outside the shop"
            className="aspect-[4/3] w-full rounded-xl border border-line object-cover"
          />
        </Reveal>

        <div>
          <Reveal>
            <span className="eyebrow">{client.copy.aboutEyebrow}</span>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {about.heading}
            </h2>
          </Reveal>
          <RevealGroup className="mt-5 space-y-4" step={0.06}>
            {about.body.map((p) => (
              <p key={p.slice(0, 24)} className="leading-relaxed">
                {p}
              </p>
            ))}
          </RevealGroup>

          {about.stats.length > 0 && (
            <RevealGroup className="mt-8 grid grid-cols-3 gap-4" step={0.08}>
              {about.stats.map((s) => (
                <div key={s.label} className="rounded-lg border border-line bg-surface p-4 text-center">
                  <div className="font-display text-2xl font-bold text-brand">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs text-ink-faint">{s.label}</div>
                </div>
              ))}
            </RevealGroup>
          )}
        </div>
      </div>
    </section>
  );
}
