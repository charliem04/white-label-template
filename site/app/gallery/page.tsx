import { client } from "@/client.config";
import { getGallery } from "@/lib/content";
import { absoluteUrl, pageMetadata } from "@/lib/meta";
import { PageHero } from "@/components/PageHero";
import { GalleryBrowser } from "@/components/GalleryBrowser";
import { CtaBand } from "@/components/CtaBand";

const meta = {
  title: "Our Work", // TODO(client)
  // TODO(client). Non-empty because scripts/seo.mjs fails the build on
  // a missing description — which is the point, but a template that
  // cannot build is a template nobody runs.
  description:
    "Photographs of our own recent jobs. Filter by the kind of work you are weighing up.",
  path: "/gallery/",
};

export const metadata = pageMetadata(meta);

export default function GalleryPage() {
  const shots = getGallery();

  // ImageGallery structured data, generated from the same photographs
  // the page renders — so it cannot describe images that are not here.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: `${client.businessName} — recent work`,
    description: meta.description,
    url: `${client.siteUrl}${meta.path}`,
    image: shots.slice(0, 12).map((s) => absoluteUrl(s.src)),
  };

  return (
    <>
      <PageHero
        path={meta.path}
        heading={client.copy.galleryHeading}
        lede={client.copy.galleryLede}
        photo={shots[0]}
      />

      <section className="band bg-surface">
        <div className="section">
          <GalleryBrowser />
        </div>
      </section>

      <CtaBand
        cta={{
          heading: client.copy.closingHeading,
          body: client.copy.closingBody,
        }}
      />

      {shots.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
    </>
  );
}
