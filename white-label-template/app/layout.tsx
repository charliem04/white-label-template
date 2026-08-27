import type { Metadata } from "next";
// Display face, self-hosted via Fontsource (bundled at build, no CDN).
// TODO(client): if the brand needs a different face, swap the package
// and the --font-display stack in globals.css together.
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";
import { client } from "@/client.config";
import { JsonLd } from "@/components/JsonLd";

// All SEO metadata is driven by client.config.ts — no per-client edits here.
export const metadata: Metadata = {
  metadataBase: new URL(client.siteUrl),
  title: client.metaTitle,
  description: client.metaDescription,
  openGraph: {
    title: client.metaTitle,
    description: client.metaDescription,
    url: client.siteUrl,
    siteName: client.businessName,
    images: [{ url: client.ogImagePath, width: 1200, height: 630 }],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <JsonLd />
      </body>
    </html>
  );
}
