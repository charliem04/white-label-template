#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════════
 *  PRELOAD THE DISPLAY FACE.
 *
 *  Every page on this site opens with a heading set in the display face,
 *  and until this ran, the browser could not know that font existed
 *  until it had downloaded and parsed the stylesheet. That is a second
 *  round trip in front of the largest text on the page — and because
 *  `font-display: swap` is set (correctly), the visible result is the
 *  heading rendering in Arial Narrow and then changing shape once the
 *  real face lands.
 *
 *  A <link rel="preload"> in the head starts that download in the same
 *  breath as the stylesheet instead of after it.
 *
 *  ── WHY THIS IS A BUILD STEP AND NOT A LINE IN layout.tsx ───────────
 *
 *  The fonts come from Fontsource, so their URLs carry a content hash —
 *  barlow-condensed-latin-800-normal.ee6f2fa6.woff2 — which
 *  changes whenever the font package is updated. A hand-written preload
 *  would be correct until the next `npm update` and then silently point
 *  at a file that no longer exists, which is worse than no preload at
 *  all: the browser fetches a 404 AND still waits for the stylesheet.
 *
 *  So the filenames are read out of the built CSS, which is the only
 *  place that knows them.
 *
 *  ── WHY ONLY ONE FACE ───────────────────────────────────────────────
 *
 *  Preloading is a promise that the file is needed immediately. Preload
 *  everything and the lesser weights compete with the heading for the
 *  same connection, which makes the thing you were trying to speed up
 *  slower. Only the weight h1/h2 are set in (800, see globals.css) is
 *  preloaded, because only it is guaranteed to be in the first
 *  screenful of every page. Body and utility text are system stacks and
 *  download nothing.
 * ════════════════════════════════════════════════════════════════════
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "out";

/** The faces worth a round trip. Matched against the built CSS. */
/**
 * TODO(client): one pattern per face that appears ABOVE THE FOLD on a
 * cold load — in practice the display weight the first heading uses,
 * and nothing else. Preloading a face the first screen does not need
 * makes it compete with one it does.
 *
 * The hash is matched rather than written out because Fontsource
 * filenames carry a content hash that changes on `npm update`. A
 * hand-written preload would be correct until then and would afterwards
 * point at a 404 — which is worse than no preload, because the browser
 * fetches the 404 AND still waits for the stylesheet.
 *
 * A pattern that matches nothing fails the build with the filename it
 * looked for, rather than shipping a page with no preload.
 */
const PRELOAD = [/barlow-condensed-latin-800-normal\.[a-f0-9]+\.woff2/];

function cssFiles(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) cssFiles(p, found);
    else if (name.endsWith(".css")) found.push(p);
  }
  return found;
}

function htmlFiles(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) htmlFiles(p, found);
    else if (name.endsWith(".html")) found.push(p);
  }
  return found;
}

export function preloadFonts() {
  if (!existsSync(OUT)) {
    console.error(`[fonts] ${OUT}/ is missing — did the build run?`);
    return false;
  }

  // Find the hashed URL of each face in the CSS that actually shipped.
  const css = cssFiles(OUT).map((f) => readFileSync(f, "utf8")).join("\n");
  const urls = [];
  for (const pattern of PRELOAD) {
    const m = css.match(pattern);
    if (!m) {
      // A rename upstream must not pass silently — a preload nobody
      // notices has stopped working is the failure this guards against.
      console.error(
        `[fonts] no font in the built CSS matched ${pattern}.\n` +
          `      The Fontsource filename probably changed; update PRELOAD in scripts/fonts.mjs.`
      );
      return false;
    }
    urls.push(`/_next/static/media/${m[0]}`);
  }

  // Confirm the file is really there before promising the browser it is.
  for (const u of urls) {
    if (!existsSync(join(OUT, u.replace(/^\//, "")))) {
      console.error(`[fonts] ${u} is referenced by the CSS but not in the build.`);
      return false;
    }
  }

  const tags = urls
    .map(
      (u) =>
        `<link rel="preload" href="${u}" as="font" type="font/woff2" crossorigin="anonymous"/>`
    )
    .join("");

  let changed = 0;
  for (const f of htmlFiles(OUT)) {
    const html = readFileSync(f, "utf8");
    if (html.includes('as="font"')) continue; // already applied
    // Immediately after <head> so it is discovered before the
    // stylesheet link rather than after it.
    const next = html.replace(/<head>/i, `<head>${tags}`);
    if (next === html) continue;
    writeFileSync(f, next);
    changed++;
  }

  console.log(
    `[fonts] preloaded ${urls.length} display face${urls.length === 1 ? "" : "s"} on ${changed} pages`
  );
  return true;
}

if (process.argv[1] && process.argv[1].endsWith("fonts.mjs")) {
  process.exit(preloadFonts() ? 0 : 1);
}
