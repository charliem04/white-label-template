#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════════
 *  WHERE EVERY LINK AND BUTTON ON THIS SITE GOES.
 *
 *  Two jobs, and the first is the important one:
 *
 *    1. VERIFY. Every internal link is resolved against the files the
 *       build actually produced. A link to a page that does not exist
 *       fails this script, which fails the build.
 *    2. DOCUMENT. The surviving map is written to docs/ROUTE-MAP.md at the repo root, so
 *       there is a page-by-page answer to "what happens when somebody
 *       presses that".
 *
 *  ── WHY IT READS THE BUILD AND NOT THE SOURCE ───────────────────────
 *
 *  A hand-written list of routes is out of date the first time somebody
 *  edits a component, and a source-level scan cannot see a destination
 *  assembled from a variable — which on this site is most of them, since
 *  hrefs come from client.config, content/*.ts and lib/routes.ts.
 *
 *  The rendered HTML has no such ambiguity. Whatever is in the `href`
 *  attribute of the file being served is, definitionally, where the
 *  visitor goes.
 *
 *  ── WHAT IT CANNOT SEE, STATED PLAINLY ──────────────────────────────
 *
 *  Buttons that move the visitor with JavaScript rather than with an
 *  href — the process steps, the radar transport, the gallery lightbox,
 *  the filter chips. Those are not navigation: they change what is on
 *  the current page. The document says so rather than pretending the
 *  list is exhaustive, and they are counted so a reader knows how many
 *  there are.
 *
 *  `npm run build` runs this with --check: it verifies and prints, and
 *  does NOT rewrite the document. `npm run routes` regenerates it.
 * ════════════════════════════════════════════════════════════════════
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const OUT = "out";
const DOC = "../docs/ROUTE-MAP.md";

/** Every built page, as a site path. */
function pages() {
  const found = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name === "index.html") {
        found.push("/" + p.slice(OUT.length + 1).replace(/index\.html$/, ""));
      }
    }
  };
  walk(OUT);
  return found.sort();
}

/** Strip tags and collapse whitespace — the words on the control. */
function label(html) {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&mdash;|&#8212;/g, "—")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 60 ? text.slice(0, 57) + "…" : text;
}

/** Pull one attribute out of a tag's attribute soup. */
function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"));
  return m ? m[1] : null;
}

/**
 * Classify a destination, and say whether it is reachable.
 *
 * An internal href is checked against the built files: `/areas/` has to
 * have produced out/areas/index.html. Anything that did not is a link
 * the visitor can press to reach a 404, which is the whole reason this
 * script exists.
 */
function resolve(href, built) {
  if (href.startsWith("tel:")) return { kind: "phone", ok: true };
  if (href.startsWith("sms:")) return { kind: "text message", ok: true };
  if (href.startsWith("mailto:")) return { kind: "email", ok: true };
  if (href.startsWith("#")) return { kind: "same page", ok: true };
  if (/^https?:\/\//.test(href)) return { kind: "external", ok: true };
  if (!href.startsWith("/")) return { kind: "relative", ok: false };

  // Fragments and query strings address a place on a page, not a page.
  const path = href.split(/[?#]/)[0];
  const withSlash = path.endsWith("/") ? path : path + "/";
  if (built.has(withSlash) || built.has(path)) return { kind: "page", ok: true };

  // A file rather than a route — the sitemap, an image, the video.
  if (existsSync(join(OUT, path.replace(/^\//, "")))) {
    return { kind: "file", ok: true };
  }
  return { kind: "page", ok: false };
}

function run({ write = true } = {}) {
  if (!existsSync(OUT)) {
    console.error(`[routes] ${OUT}/ is missing — did the build run?`);
    return false;
  }

  const all = pages();
  const built = new Set(all);
  const broken = [];
  const perPage = new Map();
  const external = new Map();
  let scripted = 0;
  let anchors = 0;

  for (const path of all) {
    const html = readFileSync(join(OUT, path.slice(1), "index.html"), "utf8");
    const links = [];
    const seen = new Set();

    for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const href = attr(m[1], "href");
      if (!href) continue;
      const text = label(m[2]) || attr(m[1], "aria-label") || "(no label)";
      // The same destination with the same words is one route, however
      // many times the layout repeats it — a nav that appears on every
      // page should not make this document twenty times longer.
      const key = `${href}|${text}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const { kind, ok } = resolve(href, built);
      if (!ok) broken.push({ from: path, href, text });
      if (kind === "external") {
        const origin = new URL(href).origin;
        external.set(origin, (external.get(origin) ?? 0) + 1);
        // An external link opened in a new tab without rel=noopener
        // hands the opened page a reference back to this one.
        const rel = attr(m[1], "rel") ?? "";
        const target = attr(m[1], "target") ?? "";
        if (target === "_blank" && !/noopener/.test(rel)) {
          broken.push({ from: path, href, text, note: "target=_blank without rel=noopener" });
        }
      }
      if (kind === "same page") anchors++;
      links.push({ href, text, kind });
    }

    // Buttons that are not links. Counted, not listed: they act on the
    // page they are on, and naming them would imply they navigate.
    for (const m of html.matchAll(/<button\b[^>]*>/gi)) {
      if (!/type="submit"/i.test(m[0])) scripted++;
    }

    links.sort((a, b) => a.kind.localeCompare(b.kind) || a.href.localeCompare(b.href));
    perPage.set(path, links);
  }

  /* ── The document ───────────────────────────────────────────────── */

  const rows = (links) =>
    links
      .map((l) => `| ${l.text.replace(/\|/g, "\\|")} | \`${l.href}\` | ${l.kind} |`)
      .join("\n");

  const totals = [...perPage.values()].flat();
  const byKind = totals.reduce((acc, l) => ((acc[l.kind] = (acc[l.kind] ?? 0) + 1), acc), {});

  const doc = `# Where every link goes

Generated by \`scripts/routes.mjs\` from the built site — not written by
hand, and not read from the source. Whatever is in the \`href\` of the
file being served is, definitionally, where the visitor ends up.

Regenerate with \`npm run routes\`. The build runs it too, and **fails if
any internal link points at a page that was not built**, so this file
cannot quietly drift from the site it describes.

_Last generated: ${new Date().toISOString().slice(0, 10)} · ${all.length} pages · ${totals.length} distinct links_

## What this covers

| Destination | Count |
| --- | --- |
${Object.entries(byKind)
  .sort((a, b) => b[1] - a[1])
  .map(([k, n]) => `| ${k} | ${n} |`)
  .join("\n")}

Counts are **distinct** destination-and-wording pairs per page. The nav
and footer repeat on all ${all.length} pages; they are listed once per page and
counted once per page, not once per occurrence.

## What this does NOT cover

${scripted} controls on this site are buttons rather than links. They do not
navigate — they act on the page the visitor is already on:

- the four **process steps** on the home page scroll the pinned band to
  that step
- the **radar** play/pause control and its frame ticks
- the **gallery** tiles and lightbox arrows
- the **gallery filters**
- the **cookie banner**, and the **"load the calendar"** consent button
- **form submit** buttons, which post to the endpoints in \`.env.example\`
  rather than to a URL

A destination assembled at runtime cannot appear in a static file, so
those are counted here and described above rather than tabulated.

## Outbound destinations

Every external origin this site links to, and how many links reach it.

| Origin | Links |
| --- | --- |
${[...external.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([o, n]) => `| ${o} | ${n} |`)
  .join("\n")}

## Page by page

${all
  .map((p) => {
    const links = perPage.get(p) ?? [];
    if (!links.length) return `### \`${p}\`\n\nNo links.\n`;
    return `### \`${p}\`\n\n| Control | Goes to | Kind |\n| --- | --- | --- |\n${rows(links)}\n`;
  })
  .join("\n")}
`;

  if (write) {
    mkdirSync(dirname(DOC), { recursive: true });
    writeFileSync(DOC, doc);
  }

  if (broken.length) {
    console.error(
      `[routes] ${broken.length} problem link${broken.length === 1 ? "" : "s"}:\n` +
        broken
          .map(
            (b) =>
              `      · ${b.from} → ${b.href}  ("${b.text}")` +
              (b.note ? `\n        ${b.note}` : "\n        that page was not built")
          )
          .join("\n")
    );
    return false;
  }

  console.log(
    `[routes] ${all.length} pages, ${totals.length} links, ${anchors} in-page anchors, ` +
      `${external.size} external origins — all resolve.` +
      (write ? ` ${DOC} written.` : "")
  );
  return true;
}

if (process.argv[1] && process.argv[1].endsWith("routes.mjs")) {
  // The build VERIFIES; `npm run routes` verifies and rewrites the doc.
  //
  // Both halves matter and they are not the same job. Failing the build
  // on a link to a page that does not exist has to happen on every
  // build. Rewriting a committed markdown file on every build does not,
  // and doing it anyway leaves the working tree dirty after a routine
  // `npm run build` — worse, the document's contents depend on which
  // environment variables were set, so two correct builds produce two
  // different files and the diff is noise either way.
  process.exit(run({ write: !process.argv.includes("--check") }) ? 0 : 1);
}

export { run };
