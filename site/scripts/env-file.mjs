/**
 * ════════════════════════════════════════════════════════════════════
 *  Read .env.local, the way the rest of the build already expects.
 *
 *  Next loads .env.local by itself, so NEXT_PUBLIC_ values reach the
 *  pages without anyone thinking about it. The scripts either side of
 *  it — gallery, csp, harden — are plain Node and saw only the real
 *  environment, which produced two failures that look like nothing at
 *  all:
 *
 *  · SANITY_PROJECT_ID in .env.local did nothing. The gallery step fell
 *    back to the committed snapshot, logged one line saying so, and
 *    shipped. The documented workaround was to export it in the shell,
 *    which is POSIX syntax that fails on PowerShell — where this project
 *    is actually developed.
 *  · csp.mjs builds connect-src from the endpoint variables, so a local
 *    build wrote a policy that forbade the very endpoints the JavaScript
 *    in the same build was compiled to call.
 *
 *  So the file is the one place values live, on every platform, and
 *  `export` versus `$env:` stops being something anybody has to know.
 *
 *  ── PRECEDENCE ──────────────────────────────────────────────────────
 *
 *  A real environment variable always wins; this only fills in what is
 *  missing. That is Next's own order, and it is what keeps a Cloudflare
 *  build authoritative — there is no .env.local there to read anyway,
 *  since it is gitignored, so this is a no-op in CI by construction.
 * ════════════════════════════════════════════════════════════════════
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The Next app root — this file lives in its scripts/ directory. */
const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Checked in order; the first file to define a name wins. */
const FILES = [".env.local", ".env"];

let loaded = false;

/**
 * Parse one file's worth of `NAME=value` lines.
 *
 * Deliberately small. It is not a dotenv replacement and does not do
 * variable expansion or multi-line values — if this project ever needs
 * those, it needs the real dependency rather than more of this.
 *
 * What it does handle is what actually turns up in these files:
 * comments, blank lines, CRLF endings and a UTF-8 BOM from a Windows
 * editor, quoted values, and a leading `export ` from somebody pasting
 * a line out of the bash instructions this replaces.
 */
function parse(text) {
  const out = [];
  for (const rawLine of text.replace(/^﻿/, "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const name = line.slice(0, eq).replace(/^export\s+/, "").trim();
    if (!name) continue;

    let value = line.slice(eq + 1).trim();

    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length > 1) {
      value = value.slice(1, -1);
    } else {
      // An unquoted value ends at a whitespace-preceded #, so a comment
      // can sit on the same line. A # with no space before it is part of
      // the value, which is how it survives being inside a password.
      const comment = value.search(/\s#/);
      if (comment !== -1) value = value.slice(0, comment).trimEnd();
    }

    out.push([name, value]);
  }
  return out;
}

/**
 * Fill process.env from the env files, without overwriting anything.
 *
 * Idempotent: safe to call from every script that needs it, including
 * several in one process.
 *
 * @returns the names it set, for logging. Never the values.
 */
export function loadEnvFile() {
  if (loaded) return [];
  loaded = true;

  const added = [];
  for (const file of FILES) {
    const path = join(APP_ROOT, file);
    if (!existsSync(path)) continue;

    let text;
    try {
      text = readFileSync(path, "utf8");
    } catch (err) {
      // Not fatal. A build that can reach its real environment should
      // not be stopped by an unreadable convenience file.
      console.warn(`[env] could not read ${file}: ${err.message}`);
      continue;
    }

    for (const [name, value] of parse(text)) {
      /*
       * An empty assignment is a placeholder, not a value.
       *
       * .env.example ships one per variable and exists to be copied to
       * .env.local, so a half-filled file is the normal state of this
       * project rather than a mistake. Without this, `SANITY_PROJECT_ID=`
       * near the top of that file beats the real value further down and
       * the build falls back to the committed gallery — silently, which
       * is the exact failure this module was written to end.
       *
       * Treating "" as unset on both sides also matches how every
       * consumer here already reads these: `(env.X ?? "").trim()` cannot
       * tell missing from empty, so neither should this.
       */
      if (value === "") continue;
      const existing = process.env[name];
      if (existing !== undefined && existing !== "") continue;

      process.env[name] = value;
      added.push(name);
    }
  }
  return added;
}
