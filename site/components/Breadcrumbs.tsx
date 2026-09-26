import Link from "next/link";
import { client } from "@/client.config";
import { trailFor } from "@/lib/routes";

/**
 * Trail derived from the route registry, so it cannot disagree with the
 * nav. Emits BreadcrumbList structured data alongside it — the same
 * trail, stated twice, once for people and once for crawlers.
 */
export function Breadcrumbs({
  path,
  leafLabel,
}: {
  path: string;
  leafLabel?: string;
}) {
  const trail = trailFor(path, leafLabel);
  if (trail.length < 2) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.label,
      item: `${client.siteUrl}${t.href}`,
    })),
  };

  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 p-0 font-mono text-[12px] uppercase tracking-[0.09em] text-ink-invert-soft/70">
          {trail.map((t, i) => {
            const last = i === trail.length - 1;
            return (
              <li key={t.href} className="flex items-center gap-2">
                {last ? (
                  <span aria-current="page" className="text-accent">
                    {t.label}
                  </span>
                ) : (
                  <Link
                    href={t.href}
                    className="no-underline transition-colors duration-150 hover:text-ink-invert active:text-accent"
                  >
                    {t.label}
                  </Link>
                )}
                {!last && (
                  <span aria-hidden className="text-ink-invert-soft/40">
                    /
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      />
    </>
  );
}
