/**
 * Inline SVG icon set (no icon-library dependency). Add new icons here
 * and reference them by name in client.config.ts service entries.
 */
import type { IconName } from "@/client.config";

const paths: Record<IconName, JSX.Element> = {
  wrench: (
    <path d="M14.7 6.3a4.5 4.5 0 0 0-6 5.4L3 17.4V21h3.6l5.7-5.7a4.5 4.5 0 0 0 5.4-6l-3 3-2.4-.6-.6-2.4 3-3Z" />
  ),
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  flame: (
    <path d="M12 22c4 0 7-2.9 7-7 0-3.5-2.5-5.6-4-8-.6 1.4-1 2.4-2.5 3.5C13 8 12.5 5 10 2c.3 3-1 4.6-2.4 6.3C6.2 10 5 11.6 5 15c0 4.1 3 7 7 7Z" />
  ),
  droplet: (
    <path d="M12 2s6.5 7.1 6.5 12a6.5 6.5 0 1 1-13 0C5.5 9.1 12 2 12 2Z" />
  ),
  gauge: (
    <>
      <path d="M12 4a9 9 0 0 0-9 9c0 2.4 1 4.7 2.6 6.3h12.8A8.9 8.9 0 0 0 21 13a9 9 0 0 0-9-9Z" />
      <path d="M12 13 16 8" stroke="rgb(var(--surface))" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  shield: (
    <path d="M12 2 4 5.5V11c0 5.2 3.4 9.4 8 11 4.6-1.6 8-5.8 8-11V5.5L12 2Z" />
  ),
  truck: (
    <path d="M1 6h13v10H1V6Zm13 3h4l3 3v4h-7V9ZM6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" stroke="rgb(var(--surface))" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  ),
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className ?? "h-6 w-6"}
    >
      {paths[name]}
    </svg>
  );
}
