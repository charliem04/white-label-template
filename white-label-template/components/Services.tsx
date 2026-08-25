import { client } from "@/client.config";
import { Icon } from "./Icon";
import { Reveal, RevealGroup } from "./Reveal";

export function Services() {
  return (
    <section id="services" className="section">
      <Reveal>
        <span className="eyebrow">{client.copy.servicesEyebrow}</span>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {client.copy.servicesHeading}
        </h2>
      </Reveal>

      <RevealGroup
        className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        step={0.08}
      >
        {client.services.map((s) => (
          <article
            key={s.title}
            className="group rounded-xl border border-line bg-surface p-6 transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-lg bg-brand-soft p-3 text-brand">
              <Icon name={s.icon} />
            </div>
            <h3 className="text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed">{s.description}</p>
          </article>
        ))}
      </RevealGroup>
    </section>
  );
}
