"use client";

import Script from "next/script";

/**
 * The Cloudflare Turnstile widget, such as it is.
 *
 * Turnstile’s own script finds every `.cf-turnstile` on the page and
 * renders into it, then writes the token into a hidden input named
 * `cf-turnstile-response` inside that element — which means the token
 * arrives in `new FormData(form)` with no React state to manage. That
 * is why there is no onChange, no ref and no token prop here: the form
 * reads it the same way it reads every other field.
 *
 * Renders nothing without a site key. Both forms fall back to their
 * unverified path in that case rather than blocking on a widget that
 * cannot appear, and the Worker is what actually enforces the check.
 *
 * The script is loaded per-form rather than in the layout on purpose:
 * most visitors never reach a form, and this is a third-party script on
 * a site that otherwise loads none.
 */
export function Turnstile({ className }: { className?: string }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
      <div
        className={`cf-turnstile ${className ?? ""}`}
        data-sitekey={siteKey}
        data-theme="light"
      />
    </>
  );
}

/** Whether a token is expected at all. */
export function turnstileConfigured(): boolean {
  return (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").length > 0;
}
