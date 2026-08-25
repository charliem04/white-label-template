import { client } from "@/client.config";
import { Icon } from "./Icon";
import { Reveal, RevealGroup } from "./Reveal";

/**
 * Services as a line-item list — the register of an invoice or the
 * services board on the shop wall — rather than an icon-chip card grid.
 */
export function Services() {
  return (
    <section id="services" className="section">
      <Reveal>
        <h2 className="text-4xl font-bold sm:text-5xl">
          {client.copy.servicesHeading}
        </h2>
      </Reveal>

      <RevealGroup className="mt-10 border-t border-line" step={0.06}>
        {client.services.map((s) => (
          <article
            key={s.title}
            className="grid gap-2 border-b border-line py-6 transition-colors hover:bg-surface-alt active:bg-line/40 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-8 sm:py-7"
          >
            <h3 className="flex items-center gap-3 text-2xl font-bold">
              <Icon name={s.icon} className="h-5 w-5 shrink-0 text-brand" />
              {s.title}
            </h3>
            <p className="leading-relaxed sm:pt-1">{s.description}</p>
          </article>
        ))}
      </RevealGroup>
    </section>
  );
}
