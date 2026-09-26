import { client } from "@/client.config";

/**
 * LocalBusiness structured data, generated entirely from
 * client.config.ts — there is no hand-written JSON to fall out of date
 * when the phone number changes.
 *
 * The @type comes from client.schemaType rather than being written
 * here, because the one thing that genuinely differs per client is what
 * kind of business it is. Validate after launch with Google’s Rich
 * Results Test.
 *
 * Empty values are stripped: a schema that asserts an empty string for
 * telephone is worse than one that stays quiet about it.
 */
export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": client.schemaType,
    name: client.businessName,
    legalName: client.legalName,
    description: client.metaDescription,
    url: client.siteUrl,
    telephone: client.phoneHref,
    email: client.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: client.address.street,
      addressLocality: client.address.city,
      addressRegion: client.address.region,
      postalCode: client.address.postalCode,
    },
    areaServed: client.about.towns.map((town) => ({
      "@type": "City",
      name: `${town}, ${client.address.region}`,
    })),
    image: client.siteUrl + client.ogImagePath,
    logo: client.siteUrl + client.logoPath,
    sameAs: [
      client.socials.facebook,
      client.socials.instagram,
      client.socials.google,
    ].filter(Boolean),
  };

  // Drop keys the config has not been filled in for. An empty
  // areaServed array or a blank telephone is a claim about the
  // business that happens to be false.
  const pruned = Object.fromEntries(
    Object.entries(data).filter(([, v]) =>
      Array.isArray(v) ? v.length > 0 : v !== "" && v != null
    )
  );

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(pruned) }}
    />
  );
}
