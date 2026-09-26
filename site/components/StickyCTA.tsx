"use client";

/**
 * Mobile-only sticky bar: Call | Text | Book.
 *
 * Traffic here is mostly mobile and often urgent, and those three are
 * genuinely different intents — call when water is coming in, text when
 * it can wait but typing is easier, book when the decision is already
 * made. Hidden at lg, where the header’s own call and assessment
 * buttons are on screen anyway.
 */
import { client } from "@/client.config";
import { CTA_HREF } from "@/lib/routes";

const cell =
  "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[13px] font-semibold no-underline transition-colors duration-150";

export function StickyCTA() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-px border-t border-line bg-line lg:hidden"
      role="region"
      aria-label="Quick contact"
    >
      <a
        href={`tel:${client.phoneHref}`}
        className={`${cell} bg-surface-deep text-ink-invert hover:bg-brand active:bg-brand-strong`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z" />
        </svg>
        Call
      </a>
      <a
        href={`sms:${client.smsHref}`}
        className={`${cell} bg-surface-deep text-ink-invert hover:bg-brand active:bg-brand-strong`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        </svg>
        Text
      </a>
      <a
        href={CTA_HREF}
        className={`${cell} bg-accent text-accent-ink hover:bg-accent-lift active:bg-accent-press`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7ZM5 9h14v10H5V9Z" />
        </svg>
        Book
      </a>
    </div>
  );
}
