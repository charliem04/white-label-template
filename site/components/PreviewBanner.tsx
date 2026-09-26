import { IS_PREVIEW, PREVIEW_NOTE, REAL_SITE } from "@/lib/preview";

/**
 * Says what this site is, on every page, to whoever happens to be
 * looking at it.
 *
 * This matters most when the preview is a replica of a REAL business —
 * real phone numbers, real address, real photographs. A stranger who
 * finds it and rings the number on it reaches an office that has never
 * seen this site, or fills in a form that reaches nobody because a
 * preview build has no form key configured.
 *
 * Deliberately not dismissible and not stored in localStorage. The
 * person it exists for is that stranger, and they are helped by a bar
 * they cannot close, not by one they click away in the first second.
 *
 * It renders nothing at all in a production build, so shipping this
 * component to the real domain is a no-op rather than an embarrassment.
 *
 * The banner is one of four layers, none of which is sufficient alone —
 * see lib/preview.ts for the other three (noindex metadata, a
 * disallow-all robots.txt, and the X-Robots-Tag header that
 * scripts/preview-headers.mjs appends).
 */
export function PreviewBanner() {
  if (!IS_PREVIEW) return null;

  return (
    <div className="border-b border-accent/40 bg-ink px-4 py-2.5 text-center text-ink-invert">
      <p className="mx-auto max-w-[80ch] text-[13px] leading-snug">
        <strong className="font-semibold text-accent">Preview.</strong>{" "}
        {PREVIEW_NOTE}
        {REAL_SITE ? (
          <>
            {" "}
            &mdash;{" "}
            <a
              href={REAL_SITE}
              className="font-semibold text-ink-invert underline underline-offset-2"
            >
              go to the official site
            </a>
            .
          </>
        ) : null}
      </p>
    </div>
  );
}
