import { client } from "@/client.config";

/**
 * LocalBusiness structured data, generated from client.config.ts.
 * Validate after launch with Google's Rich Results Test.
 */
export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness", // TODO(client): narrow if applicable, e.g. "HVACBusiness", "Electrician", "AutoRepair"
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
    image: client.siteUrl + client.ogImagePath,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
