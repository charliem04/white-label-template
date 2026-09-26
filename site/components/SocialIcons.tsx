import { client } from "@/client.config";

/**
 * Social links live here — the utility strip and the footer — and not
 * in the main nav. A Facebook tab in the primary nav sends the visitor
 * to Meta mid-decision; an icon on the rail keeps the access without
 * the pull.
 */
const paths: Record<string, string> = {
  Facebook:
    "M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.63A21 21 0 0 0 14.28 3.5c-2.4 0-4.05 1.47-4.05 4.16V9.9H7.5V13h2.73v8h3.27Z",
  Instagram:
    "M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm5.9-7.8a1.07 1.07 0 1 1-2.15 0 1.07 1.07 0 0 1 2.15 0ZM21 8.9c-.05-1.45-.38-2.73-1.44-3.79-1.06-1.06-2.34-1.39-3.79-1.44C14.28 3.58 9.72 3.58 8.23 3.67c-1.45.05-2.73.38-3.79 1.44C3.38 6.17 3.05 7.45 3 8.9c-.09 1.49-.09 6.05 0 7.54.05 1.45.38 2.73 1.44 3.79 1.06 1.06 2.34 1.39 3.79 1.44 1.49.09 6.05.09 7.54 0 1.45-.05 2.73-.38 3.79-1.44 1.06-1.06 1.39-2.34 1.44-3.79.09-1.49.09-6.04 0-7.54Zm-1.92 9.14a3.04 3.04 0 0 1-1.71 1.71c-1.18.47-3.99.36-5.3.36-1.31 0-4.12.1-5.3-.36a3.04 3.04 0 0 1-1.71-1.71c-.47-1.18-.36-3.99-.36-5.3 0-1.31-.1-4.12.36-5.3a3.04 3.04 0 0 1 1.71-1.71c1.18-.47 3.99-.36 5.3-.36 1.31 0 4.12-.1 5.3.36a3.04 3.04 0 0 1 1.71 1.71c.47 1.18.36 3.99.36 5.3 0 1.31.11 4.12-.36 5.3Z",
};

export function SocialIcons({
  className,
  linkClassName,
  size = 18,
}: {
  className?: string;
  linkClassName?: string;
  size?: number;
}) {
  const links = [
    { label: "Facebook", href: client.socials.facebook },
    { label: "Instagram", href: client.socials.instagram },
  ].filter((l) => l.href);

  if (links.length === 0) return null;

  return (
    <span className={`flex items-center gap-3 ${className ?? ""}`}>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${client.businessName} on ${l.label}`}
          className={
            linkClassName ??
            "text-ink-invert-soft transition-colors duration-150 hover:text-accent active:text-accent-press"
          }
        >
          <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
            <path d={paths[l.label]} />
          </svg>
        </a>
      ))}
    </span>
  );
}
