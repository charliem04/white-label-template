import type { MetadataRoute } from "next";
import { client } from "@/client.config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${client.siteUrl}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${client.siteUrl}/terms/`, priority: 0.2 },
    { url: `${client.siteUrl}/privacy/`, priority: 0.2 },
  ];
}
