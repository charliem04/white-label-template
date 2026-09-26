import type { Metadata } from "next";
import { client } from "@/client.config";
import { IS_PREVIEW } from "@/lib/preview";
import type { PageMeta } from "@/content/types";

/**
 * The robots directive for a page that states its own index policy —
 * the legal pages and the 404, which do not go through pageMetadata().
 *
 * They set `robots` themselves, which overrides the layout's, so
 * without this a preview build leaves exactly those pages followable.
 * Everything that decides "should a crawler touch this" now runs
 * through either here or pageMetadata().
 */
export function robotsFor(index: boolean): NonNullable<Metadata["robots"]> {
  if (IS_PREVIEW) return { index: false, follow: false };
  // noindex, follow for a legal page: keep it out of results but let
  // the links out of it still count.
  return { index, follow: true };
}

/**
 * A site-absolute path turned into a full URL — unless it already is
 * one, in which case it is returned untouched.
 *
 * Structured data has to carry absolute URLs, and until the gallery
 * moved to Sanity every photograph on this site was a path in public/,
 * so prefixing client.siteUrl was always right. The gallery's images
 * now come from a CDN and arrive absolute; prefixing those produced
 * "https://www.example.comhttps://cdn.sanity.io/…" in the ImageGallery
 * JSON-LD, which is a URL that resolves to nothing and was being
 * handed to Google as the address of the photograph.
 *
 * Caught by the drift check in scripts/csp.mjs, which reads every
 * origin in the built output and did not recognise the one this
 * created. Worth recording: nothing about a broken URL inside a JSON
 * blob is visible on the rendered page.
 */
export function absoluteUrl(pathOrUrl: string): string {
  return /^https?:\/\//.test(pathOrUrl)
    ? pathOrUrl
    : `${client.siteUrl}${pathOrUrl}`;
}

/**
 * Per-page <head>, built from one PageMeta so title, description,
 * canonical and OG can never disagree with each other. The site name is
 * appended here rather than repeated in every content file.
 */
export function pageMetadata(
  meta: PageMeta,
  /**
   * Keep the page out of the index. Used by a route that is built but
   * not yet live: the file has to exist for the export to compile, and
   * an unfinished page that a crawler can find is worse than no page.
   */
  opts: { noindex?: boolean } = {}
): Metadata {
  const title = `${meta.title} | ${client.businessName}`;
  return {
    title,
    // A preview build is noindex whatever the page asked for.
    ...(opts.noindex || IS_PREVIEW
      ? { robots: { index: false, follow: false } }
      : {}),
    description: meta.description,
    alternates: { canonical: `${client.siteUrl}${meta.path}` },
    openGraph: {
      title,
      description: meta.description,
      url: `${client.siteUrl}${meta.path}`,
      siteName: client.businessName,
      images: [{ url: client.ogImagePath, width: 1200, height: 630 }],
      type: "website",
    },
  };
}
