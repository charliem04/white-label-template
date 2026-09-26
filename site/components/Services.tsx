import { client } from "@/client.config";
import { getServices } from "@/lib/content";
import { Icon } from "./Icon";
import { RevealGroup } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { MoreLink } from "./MoreLink";

/**
 * Services as a line-item list — the register of an invoice or the
 * services board on the shop wall — rather than an icon-chip card grid.
 *
 * Read from content/services.ts through lib/content.ts, the same list
 * the nav dropdown, the sitemap and the service pages are built from,
 * so a service added there appears here with no second edit. Each line
 * is a link to its own page: a band should carry its own way onward.
 */
export function Services() {
  const services = getServices();
  if (services.length === 0) return null;

  return (
    <section id="services" className="band bg-surface">
      <div className="section">
        <SectionHead
          heading={client.copy.servicesHeading}
          lede={client.copy.servicesLede}
        />

        <RevealGroup className="mt-10 border-t border-line">
          {services.map((s) => (
            <a
              key={s.slug}
              href={s.meta.path}
              className="grid gap-2 border-b border-line py-6 text-ink-soft no-underline transition-colors duration-150 hover:bg-surface-alt active:bg-line/40 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-8 sm:py-7"
            >
              <h3 className="flex items-center gap-3 text-display-4">
                {s.icon && <Icon name={s.icon} className="h-5 w-5 shrink-0 text-accent" />}
                {s.navLabel}
              </h3>
              <p className="sm:pt-1">{s.summary}</p>
            </a>
          ))}
        </RevealGroup>

        <p className="mt-10">
          <MoreLink href="/services/">All services</MoreLink>
        </p>
      </div>
    </section>
  );
}
