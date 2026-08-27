"use client";

/**
 * Mobile-only sticky call/estimate bar — the highest-converting element
 * on trade sites. Hidden on md+ where the nav CTA is visible.
 */
import { client } from "@/client.config";

export function StickyCTA() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-px border-t border-line bg-line md:hidden" role="region" aria-label="Quick contact">
      <a
        href={`tel:${client.phoneHref}`}
        className="flex items-center justify-center gap-2 bg-brand py-3.5 font-semibold text-white active:bg-brand-strong"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z" />
        </svg>
        Call now
      </a>
      <a
        href="#contact"
        className="flex items-center justify-center gap-2 bg-surface py-3.5 font-semibold text-ink active:bg-surface-alt"
      >
        {client.copy.stickyCtaLabel}
      </a>
    </div>
  );
}
