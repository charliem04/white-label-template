import { notFound } from "next/navigation";
import { client } from "@/client.config";
import { getService, getServiceSlugs } from "@/lib/content";
import { pageMetadata } from "@/lib/meta";
import { PageHero } from "@/components/PageHero";
import { SectionHead } from "@/components/SectionHead";
import { Reveal } from "@/components/Reveal";
import { FaqList } from "@/components/FaqList";
import { CtaBand } from "@/components/CtaBand";

type Params = { params: { slug: string } };

export function generateStaticParams() {
  return getServiceSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Params) {
  const service = getService(params.slug);
  return service ? pageMetadata(service.meta) : {};
}

/**
 * One page per entry in content/services.ts. The route, the nav item,
 * the sitemap entry and the breadcrumb all derive from the same record,
 * so there is nothing to keep in sync by hand.
 */
export default function ServiceDetailPage({ params }: Params) {
  const service = getService(params.slug);
  if (!service) notFound();

  // Service structured data, generated from the same content the page
  // renders — provider, area, and what is actually offered.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.heading,
    description: service.meta.description,
    serviceType: service.navLabel,
    url: `${client.siteUrl}${service.meta.path}`,
    provider: {
      "@type": client.schemaType,
      name: client.businessName,
      telephone: client.phoneHref,
      url: client.siteUrl,
    },
    areaServed: client.about.towns.map((town) => ({
      "@type": "City",
      name: `${town}, ${client.address.region}`,
    })),
  };

  return (
    <>
      <PageHero
        path={service.meta.path}
        heading={service.heading}
        lede={service.lede}
        photo={service.photo}
      />

      {service.sections.map((section, i) => (
        <section
          key={section.heading || i}
          className={`band ${i % 2 ? "bg-surface-alt" : "bg-surface"}`}
        >
          <div className="section">
            <SectionHead heading={section.heading} />
            {section.body?.map((p) => (
              <Reveal key={p}>
                <p className="mt-4 max-w-[62ch] text-ink-soft">{p}</p>
              </Reveal>
            ))}
            {section.columns?.length ? (
              <div className="mt-8 grid gap-8 sm:grid-cols-2">
                {section.columns.map((col, c) => (
                  <Reveal key={col.label ?? c}>
                    {col.label ? (
                      <p className="u-label text-brand">{col.label}</p>
                    ) : null}
                    <ul className="mt-3 space-y-2 text-ink-soft">
                      {col.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </Reveal>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ))}

      {service.faqs.length ? (
        <section className="band bg-surface">
          <div className="section">
            <SectionHead heading="Common questions" />
            <FaqList faqs={service.faqs} />
          </div>
        </section>
      ) : null}

      <CtaBand cta={service.cta} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
