import type { MetadataRoute } from "next";
import { client } from "@/client.config";
import { livePaths } from "@/lib/routes";
import { IS_PREVIEW } from "@/lib/preview";

export const dynamic = "force-static";

/**
 * Generated from the route registry, so a page that exists is listed
 * and a phase-2 route that does not exist yet is not — the sitemap
 * cannot drift from the nav because they read the same source.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Nothing to offer from a preview host. Every URL here is absolute
  // and points at the real domain, so a preview sitemap would either
  // advertise the client's live pages from the wrong origin or advertise the
  // replica. Neither is wanted.
  if (IS_PREVIEW) return [];

  return livePaths().map(({ path, priority }) => ({
    url: `${client.siteUrl}${path}`,
    priority,
    changeFrequency: path === "/" ? "weekly" : "monthly",
  }));
}
