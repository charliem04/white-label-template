/**
 * ════════════════════════════════════════════════════════════════════
 *  CONTENT-SECURITY-POLICY, generated at build time.
 *
 *  public/_headers carries the headers that never change. This one has
 *  to be generated, because some of the origins it allows are only
 *  known from the environment the build ran in: the careers Worker, the
 *  CRM webhook, and any override of the form endpoint. A hand-written
 *  policy would either omit them (breaking the feature in production
 *  and nowhere else) or allow them unconditionally (pointless).
 *
 *  The drift check at the bottom is the part that keeps this honest:
 *  every https origin that appears anywhere in out/ has to be covered
 *  by the policy or declared in INTEGRATIONS below as something the
 *  browser never fetches. Adding an embed, or a CDN for the gallery
 *  photographs, fails the build until somebody decides which it is.
 *
 *  PER CLIENT you edit INTEGRATIONS and nothing else in this file.
 *
 *  ── WHY script-src CARRIES 'unsafe-inline', WHICH IS NOT IDEAL ──────
 *
 *  Next puts eight inline <script> blocks on every page — the flight
 *  data that hydrates it. A static export has no server, so there is no
 *  nonce to issue. The alternative is hashing all eight per page and
 *  writing per-path rules, and those hashes change with every build:
 *  buildId, chunk names, page content. If the generator ever drifts
 *  from the actual output by one byte, the browser blocks hydration and
 *  the site serves blank pages — a total outage caused by a security
 *  header, on a site whose job is to take phone calls.
 *
 *  So the trade is deliberate. What this policy still buys, and it is
 *  the realistic threat for a static marketing site:
 *
 *    · A script cannot be loaded from an origin not listed here. A
 *      compromised dependency that tries to phone home is blocked.
 *    · object-src 'none' and base-uri 'self' close two injection
 *      routes that do not need inline script at all.
 *    · frame-ancestors 'none' keeps the site out of anyone's iframe.
 *
 *  What it does not buy: protection against injected inline script.
 *  That is acceptable here because nothing renders user-supplied HTML —
 *  React escapes every string, and both uses of dangerouslySetInnerHTML
 *  are our own content with nothing interpolated from outside: the
 *  JSON-LD built from client.config, and the <noscript> stylesheet in
 *  app/layout.tsx that un-hides scroll-reveal content when JavaScript
 *  never arrives. If that ever stops being true — if either one starts
 *  taking a value from a URL, a form or an API — this comment is the
 *  thing to come back to.
 * ════════════════════════════════════════════════════════════════════
 */
import { appendFileSync, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadEnvFile } from "./env-file.mjs";

// connect-src is built from the endpoint variables, so without this a
// local build writes a policy forbidding the endpoints the JavaScript
// in the same build was compiled to call.
loadEnvFile();

const HEADERS = "out/_headers";
const MARKER = "# ── Content-Security-Policy (generated) ──";

/** Origin of a URL, or "" if it is not one. */
function origin(u) {
  try {
    return new URL(u).origin;
  } catch {
    return "";
  }
}

/**
 * ════════════════════════════════════════════════════════════════════
 *  THE ONE BLOCK TO EDIT PER CLIENT.
 *
 *  Every third-party origin this site touches, sorted by WHAT THE
 *  BROWSER ACTUALLY DOES WITH IT. That distinction is the whole design:
 *  a CSP that lists an origin the site only ever links to is a false
 *  statement about what the page may fetch, and the drift check below
 *  is only worth anything if the declarations are honest.
 *
 *  Adding an integration is an edit here and nowhere else. Adding one
 *  WITHOUT editing here fails the build, by design — see checkDrift().
 * ════════════════════════════════════════════════════════════════════
 */
export const INTEGRATIONS = {
  /**
   * Origins the browser FETCHES from with XHR/fetch. These go in
   * connect-src. Each one is a place visitor data can be sent, so add
   * with intent.
   */
  connect: [
    "https://api.web3forms.com", // contact form (lib/submitContact.ts)
    "https://plausible.io", // analytics events, after consent
    // "https://places.googleapis.com", // live Google reviews
  ],

  /** Origins that serve <script>. Kept short on purpose. */
  script: [
    "https://plausible.io", // components/Analytics.tsx, after consent
    "https://challenges.cloudflare.com", // Turnstile, components/Turnstile.tsx
  ],

  /**
   * Origins that serve images. A CMS image CDN goes here — and only
   * here, if nothing else loads from it.
   */
  img: [
    // Every gallery photograph, at a width and crop chosen by
    // scripts/gallery.mjs. A fetch origin, not a link target: nothing
    // else on the site loads from it — no script, no font, no
    // stylesheet — which is why it is here and in no other directive.
    "https://cdn.sanity.io",
    // "https://*.googleusercontent.com", // Google review avatars
  ],

  /** Origins allowed to be embedded in an <iframe>. */
  frame: [
    // TODO(client): the scheduler in client.bookingUrl — keep the one
    // this client uses and delete the other. An allowed frame origin
    // nothing embeds is a door left open for no reason. Swapping
    // schedulers without editing this list is blocked by the browser,
    // which is why the drift check exists. lib/booking.ts knows both.
    "https://calendly.com",
    "https://cal.com",
    "https://challenges.cloudflare.com", // Turnstile renders in an iframe
    // TODO(client): the Google Maps embed in client.mapEmbedSrc
    // (components/Contact.tsx). Its src is
    // https://www.google.com/maps/embed?…, so the frame origin is
    // www.google.com; the tiles and scripts load inside that iframe
    // under Google's own policy, not this one. Delete this line if the
    // client has no map.
    "https://www.google.com",
  ],

  /** Origins serving <video>/<audio>. "'self'" is already allowed. */
  media: [],

  /**
   * Origins that appear in the built output as LINK TARGETS ONLY — an
   * href a person clicks, or a string inside JSON-LD. The browser never
   * fetches these as a subresource, so CSP has no say over them and
   * they must NOT be added to a fetch directive just to quiet the drift
   * check. Declaring one here is a claim you are making; if it turns
   * out the page does fetch it, the browser blocks it and the policy
   * was lying.
   */
  linkOnly: [
    "https://schema.org", // JSON-LD @context, a string, never fetched
    "https://www.facebook.com",
    "https://www.instagram.com",
    "https://g.page",
    // TODO(client): this site's own canonical origin, as it appears in
    // canonicals, JSON-LD and the OG tags.
    "https://www.example.com",
    // Framework strings baked into React/Next dev warnings.
    "https://nextjs.org",
    "https://react.dev",
    "https://reactjs.org",
    "https://github.com",
  ],

  /**
   * Origins that appear only as constants inside framework code this
   * site does not exercise, or inside a CSS comment. Next ships a table
   * of font-provider URLs in its runtime chunk whether or not you use
   * next/font; nothing here is ever fetched, and adding them to the
   * policy would allow origins the site has no business talking to.
   *
   * Verify by grep before adding to this list rather than to a real
   * directive — that is the difference between a declaration and a
   * shrug.
   */
  inert: [
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    "https://use.typekit.net",
    "https://tailwindcss.com",
  ],

  /**
   * Origins this site opens a TCP+TLS connection to and then never asks
   * for anything.
   *
   * A <link rel="preconnect"> performs the handshake and stops. No
   * request is issued, so no fetch directive governs it — connect-src
   * does not apply, and adding one of these there would be a false
   * statement in the policy: it would permit fetches this document must
   * never make.
   *
   * They still belong somewhere visible, because a preconnect is a real
   * disclosure of the visitor's IP to a third party. Warm one only
   * behind cookie consent, and only when an embed genuinely fetches
   * from it once it loads — a preconnect to anywhere else is a
   * connection opened for nothing.
   */
  preconnectOnly: [
    // The booking embed's JS and CSS. Our document never fetches it;
    // the iframe does, under the scheduler's own policy rather than
    // this one. See SCHEDULERS in lib/booking.ts.
    "https://assets.calendly.com",
  ],
};

const LINK_ONLY = new Set(INTEGRATIONS.linkOnly);
const INERT = new Set(INTEGRATIONS.inert);
const PRECONNECT_ONLY = new Set(INTEGRATIONS.preconnectOnly);

/** `directive 'self' a b c`, with the empties dropped. */
const list = (name, ...parts) =>
  [name, ...parts.flat().filter(Boolean)].join(" ");

export function buildCsp(env = process.env) {
  // Only the endpoints this build actually points at. Reading them
  // from the environment is what keeps a policy generated on a laptop
  // from forbidding the Worker a production build talks to.
  const extra = [
    env.NEXT_PUBLIC_CAREERS_ENDPOINT, // the résumé upload Worker
    env.NEXT_PUBLIC_LEAD_WEBHOOK_URL, // optional CRM copy
    env.NEXT_PUBLIC_FORM_ENDPOINT, // only when overriding the form host
  ]
    .map((u) => origin(u ?? ""))
    .filter(Boolean);

  const connect = [
    "'self'",
    ...INTEGRATIONS.connect,
    ...new Set(extra),
  ];

  return [
    "default-src 'self'",
    // See the header comment for why 'unsafe-inline' is here.
    list("script-src", "'self'", "'unsafe-inline'", INTEGRATIONS.script),
    // React writes style attributes; there is no nonce for those either.
    "style-src 'self' 'unsafe-inline'",
    // data: for the inlined SVG icons.
    list("img-src", "'self'", "data:", INTEGRATIONS.img),
    "font-src 'self'", // Fontsource bundles them, nothing external
    list("media-src", "'self'", INTEGRATIONS.media),
    connect.join(" ").replace(/^/, "connect-src "),
    ...(INTEGRATIONS.frame.length
      ? [list("frame-src", INTEGRATIONS.frame)]
      : ["frame-src 'none'"]),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** Every https origin referenced anywhere in the built output. */
function originsInBuild(dir = "out") {
  const found = new Set();
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) {
        // Every directory in the output, with no exceptions.
        //
        // There used to be one: out/admin held the git-backed CMS and
        // had its own, looser policy written by scripts/cms.mjs — a CDN
        // for the editor bundle and the GitHub API to commit through.
        // Excluding it from this scan was the price of not widening the
        // site policy to cover a page one person used.
        //
        // The editor is hosted by Sanity now and serves from its own
        // domain, so this site ships no admin page, needs no second
        // policy, and this scan covers everything it publishes.
        walk(p);
        continue;
      }
      if (!/\.(html|js|css|json|txt|xml)$/.test(name)) continue;
      for (const m of readFileSync(p, "utf8").matchAll(
        /https:\/\/[a-zA-Z0-9.-]+[a-zA-Z0-9]/g
      )) {
        const o = origin(m[0]);
        if (o) found.add(o);
      }
    }
  };
  walk(dir);
  return found;
}

/**
 * Fail the build on drift.
 *
 * A CSP that silently stops covering something is worse than none —
 * it reads as protection while a new embed goes unlisted, or blocks a
 * feature that shipped after the policy was written. So every origin in
 * the output has to be either allowed by the policy or declared
 * link-only above. Adding an embed now forces a decision here.
 */
function checkDrift(csp) {
  const allowed = new Set(
    [...csp.matchAll(/https:\/\/[a-zA-Z0-9.*-]+/g)].map((m) => m[0])
  );
  const unaccounted = [...originsInBuild()].filter((o) => {
    if (LINK_ONLY.has(o) || INERT.has(o) || PRECONNECT_ONLY.has(o)) return false;
    if (allowed.has(o)) return false;
    // Wildcard entries such as https://*.googleusercontent.com
    for (const a of allowed) {
      if (!a.includes("*")) continue;
      const re = new RegExp("^" + a.replace(/[.]/g, "\\.").replace(/\*/g, "[^.]+") + "$");
      if (re.test(o)) return false;
    }
    return true;
  });
  return unaccounted;
}

export function applyCsp(env = process.env) {
  if (!existsSync(HEADERS)) {
    console.error(`[csp] ${HEADERS} missing — did the build run?`);
    return false;
  }
  if (readFileSync(HEADERS, "utf8").includes(MARKER)) {
    console.log("[csp] already applied, nothing to do");
    return true;
  }

  const csp = buildCsp(env);

  const drift = checkDrift(csp);
  if (drift.length) {
    console.error(
      "[csp] Origins in the build that the policy does not cover:\n" +
        drift.map((o) => `        ${o}`).join("\n") +
        "\n      Add each to the policy in scripts/csp.mjs, or to LINK_ONLY\n" +
        "      if it is only ever an href a person clicks."
    );
    return false;
  }

  appendFileSync(
    HEADERS,
    `\n\n${MARKER}\n# Generated by scripts/csp.mjs. Edit the policy there, not here.\n/*\n  Content-Security-Policy: ${csp}\n`
  );
  console.log(`[csp] applied (${csp.length} chars)`);
  return true;
}

if (process.argv[1] && process.argv[1].endsWith("csp.mjs")) {
  process.exit(applyCsp() ? 0 : 1);
}
