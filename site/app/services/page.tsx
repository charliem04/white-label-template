import { getServicesHub, getServices } from "@/lib/content";
import { pageMetadata } from "@/lib/meta";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";
import { Reveal, RevealGroup } from "@/components/Reveal";
import { MoreLink } from "@/components/MoreLink";

const hub = getServicesHub();

export const metadata = pageMetadata(hub.meta);

/**
 * The services hub. The grid is generated from content/services.ts, so
 * a service added there appears here, in the nav, in the sitemap and in
 * the breadcrumbs without a second edit.
 */
export default function ServicesPage() {
  const services = getServices();

  return (
    <>
      <PageHero
        path={hub.meta.path}
        heading={hub.heading}
        lede={hub.lede}
        photo={hub.photo}
      />
      <section className="band bg-surface-alt">
        <div className="section">
          <RevealGroup className="grid gap-8 sm:grid-cols-2">
            {services.map((s) => (
              <Reveal key={s.slug}>
                <h2 className="text-display-3">{s.navLabel}</h2>
                <p className="mt-3 text-ink-soft">{s.summary}</p>
                <MoreLink href={s.meta.path}>Read more</MoreLink>
              </Reveal>
            ))}
          </RevealGroup>
        </div>
      </section>
      <CtaBand cta={hub.cta} />
    </>
  );
}
