/**
 * ════════════════════════════════════════════════════════════════════
 *  CONVERSION TRACKING
 *
 *  Two separate things, often confused:
 *
 *  1. EVENTS — did someone tap call, text, book, or send the form.
 *     Handled here, forwarded to Plausible if it is loaded. It is only
 *     loaded after cookie consent, so declining consent means these are
 *     silent no-ops. Nothing is stored or sent by this module itself.
 *
 *  2. CALL TRACKING (dynamic number insertion) — showing a different
 *     phone number per channel so the client can tell whether the site,
 *     the Google Business Profile or Facebook produced the call. That
 *     needs the provider's own script (CallRail and friends), which
 *     rewrites numbers in the DOM at runtime. Set the script URL in
 *     client.config.ts → tracking.dniScriptUrl and it loads with the
 *     other consented scripts. Leave it empty and every number on the
 *     site stays the real one in client.config.ts.
 *
 *  Nothing here fires without a real user gesture, and no event carries
 *  anything identifying — just which action, on which page.
 * ════════════════════════════════════════════════════════════════════
 */

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string> }) => void;
  }
}

export type ConversionEvent = "Call" | "Text" | "Book" | "Form submit";

export function trackEvent(
  event: ConversionEvent,
  props: Record<string, string> = {}
): void {
  if (typeof window === "undefined") return;
  try {
    window.plausible?.(event, {
      props: { path: window.location.pathname, ...props },
    });
  } catch {
    // Analytics must never break a phone call.
  }
}
