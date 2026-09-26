/**
 * Build the preview bundle. Works on Windows as well as Unix.
 *
 * Runs gallery -> next build -> csp -> seo -> preview headers -> harden,
 * which is `npm run build` plus the noindex headers and minus the font
 * preload and the route check. Anything that decides whether the output
 * is CORRECT belongs in both lists: while the terminal preview is the
 * only deployment that exists, it is the only thing checking, and a
 * check that runs solely in production is a check nobody has run yet.
 *
 * This used to be `NEXT_PUBLIC_PREVIEW=1 npm run build` in the npm
 * script, which is POSIX shell syntax. npm runs scripts through cmd.exe
 * on Windows, and cmd does not understand `VAR=value command` — it
 * reads NEXT_PUBLIC_PREVIEW as the name of a program and fails with
 * "is not recognized as an internal or external command". So the flag
 * is set here, in Node, where every platform agrees.
 *
 * Next is invoked as `node <path-to-next-bin> build` rather than by
 * spawning `next` or `npm`: on Windows those resolve to .cmd shims that
 * need shell:true to launch, and shell:true drags command-line quoting
 * differences back in. Running the JS entry point under the current
 * Node binary sidesteps all of it.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { applyPreviewHeaders } from "./preview-headers.mjs";
import { applyCsp } from "./csp.mjs";
import { checkSeo } from "./seo.mjs";
import { run as buildGallery } from "./gallery.mjs";
import { harden } from "./harden.mjs";

const require = createRequire(import.meta.url);

let nextBin;
try {
  // Resolve through the package rather than hardcoding node_modules —
  // correct under npm, pnpm and yarn layouts alike.
  nextBin = require.resolve("next/dist/bin/next");
} catch {
  console.error(
    "[preview] Cannot find Next. Run `npm install` in client-site first."
  );
  process.exit(1);
}

if (!existsSync(nextBin)) {
  console.error(`[preview] Next resolved to a missing file: ${nextBin}`);
  process.exit(1);
}

/*
 * The gallery, before Next reads content/. Production runs this as the
 * first step of `npm run build`; preview did not, which meant a preview
 * deploy shipped whatever snapshot happened to be committed no matter
 * what SANITY_PROJECT_ID was set to — silently, because falling back to
 * the snapshot is a legitimate state that only prints a log line.
 *
 * So the one deploy anybody actually looks at was the one that could
 * not show a gallery change. It also skipped this script's own checks:
 * alt text, duplicate photographs, unknown categories, and the studio's
 * category list drifting from the site's own.
 *
 * Called with the ambient environment, exactly as production calls it.
 */
if (!(await buildGallery())) {
  console.error("[preview] gallery step failed — not building.");
  process.exit(1);
}

console.log("[preview] building with NEXT_PUBLIC_PREVIEW=1");

const build = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_PREVIEW: "1" },
});

if (build.error) {
  console.error("[preview] could not start the build:", build.error.message);
  process.exit(1);
}
if (build.status !== 0) {
  // Next already printed why. Don't apply headers to a broken build.
  process.exit(build.status ?? 1);
}

/*
 * The CSP is generated for both builds — a preview that behaves
 * differently from production is a preview that proves less.
 *
 * harden() runs last, after the preview headers, so it sees the output
 * as it will actually be uploaded. It is the check that fails the build
 * if a Sanity read token, or anything shaped like one, reaches out/ —
 * which is precisely the risk a preview build carries, because a
 * preview is where a token gets tried for the first time.
 *
 * Also called with the ambient environment: it compares non-publishable
 * env values against the output, and handing it this script's own
 * NEXT_PUBLIC_PREVIEW would be a variable production never sees.
 */
process.exit(
  applyCsp() && checkSeo() && applyPreviewHeaders() && harden() ? 0 : 1
);
