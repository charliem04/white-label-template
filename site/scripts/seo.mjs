/**
 * Post-build SEO invariants, checked against the real output.
 *
 * These are the things that are cheap to get right, invisible when they
 * go wrong, and easy to undo by accident — a title grows by four words
 * during a content edit and nobody notices until it is truncated in
 * search results months later. Checking the built HTML rather than the
 * source means it cannot be fooled by how a title is assembled.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Google truncates a result title at roughly 600 pixels, which is
 * conventionally approximated as 60 characters. It is a proxy, not a
 * rule — wide capitals hit the limit sooner — so this is a ceiling to
 * stay under rather than a target to hit.
 */
const MAX_TITLE = 60;

/** Descriptions are truncated around here too. Under is fine; empty is not. */
const MAX_DESCRIPTION = 160;

function pages(dir = "out", out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (name === "index.html") out.push(p);
  }
  return out;
}

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");

export function checkSeo() {
  const problems = [];

  for (const f of pages()) {
    const path = "/" + f.slice("out/".length).replace("index.html", "");
    const html = readFileSync(f, "utf8");

    const title = decode((html.match(/<title>([^<]*)<\/title>/) ?? [, ""])[1]);
    const desc = decode(
      (html.match(/<meta name="description" content="([^"]*)"/) ?? [, ""])[1]
    );

    if (!title) problems.push(`${path} has no <title>`);
    else if (title.length > MAX_TITLE)
      problems.push(`${path} title is ${title.length} chars: ${title}`);

    // A page nobody can find in search does not need a description
    // tuned for search. The legal pages and the 404 inherit the site
    // default deliberately.
    const indexable = !/<meta name="robots" content="[^"]*noindex/.test(html);
    if (!indexable) continue;

    if (!desc) problems.push(`${path} has no description`);
    else if (desc.length > MAX_DESCRIPTION)
      problems.push(`${path} description is ${desc.length} chars`);
  }

  if (problems.length) {
    console.error("[seo] " + problems.join("\n      "));
    return false;
  }
  console.log(`[seo] ${pages().length} pages: titles and descriptions in range`);
  return true;
}

if (process.argv[1] && process.argv[1].endsWith("seo.mjs")) {
  process.exit(checkSeo() ? 0 : 1);
}
