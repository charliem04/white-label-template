import type { MetadataRoute } from "next";
import { client } from "@/client.config";
import { IS_PREVIEW } from "@/lib/preview";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  // A preview build turns every crawler away and advertises no sitemap.
  // The pages carry noindex too — this is the layer that stops a
  // well-behaved crawler before it ever fetches one.
  if (IS_PREVIEW) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    // Everything published here is content. The gallery editor used to
    // live at /admin/ and was disallowed from here; it is a hosted
    // studio on Sanity's own domain now, so there is nothing on this
    // origin to keep a crawler out of.
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${client.siteUrl}/sitemap.xml`,
  };
}
