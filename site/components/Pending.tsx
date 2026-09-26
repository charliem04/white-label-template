import type { PendingContent } from "@/content/types";

/**
 * A gap marker for us, never for a visitor.
 *
 * This renders only in development. A note reading "waiting on the client"
 * is exactly the right thing to see in `npm run dev` and exactly the
 * wrong thing to put in front of the client it names — on a demo build
 * it reads as unfinished homework, and on a live site it reads as an
 * internal memo left on the wall.
 *
 * So the rule is: every place that would show a gap has to supply real,
 * honest visitor-facing content for the built site. Nothing invented,
 * nothing apologetic, and no reference to what is missing. The gaps
 * themselves stay tracked in content/pending.ts, which is what the
 * handover sheet is generated from.
 */
export function Pending({
  content,
  className,
}: {
  content: PendingContent;
  className?: string;
}) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div
      className={`rounded border border-dashed border-brand-soft/60 bg-surface-alt/60 p-6 ${
        className ?? ""
      }`}
    >
      <p className="u-label flex items-center gap-2">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-accent-press" />
        Content pending · dev only
      </p>
      <p className="mt-3 max-w-[62ch] text-ink">{content.needs}</p>
      {content.from && (
        <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.09em] text-ink-faint">
          Waiting on {content.from}
        </p>
      )}
    </div>
  );
}
