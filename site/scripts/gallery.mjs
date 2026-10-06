#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════════
 *  GALLERY PREFLIGHT — fetch what the office published, then refuse to
 *  build if it is not usable.
 *
 *  The photographs live in Sanity now. Somebody in the office opens the
 *  studio, drags a photo into place, writes what is in the frame, and
 *  presses Publish; a webhook pokes a Cloudflare deploy hook; this runs
 *  first in the build that follows.
 *
 *  It does three things, in this order, and the order matters:
 *
 *    1. Checks that the five categories are still five categories. The
 *       list exists in three places — the TypeScript union in
 *       content/types.ts, the labels and service routes in
 *       content/gallery.ts, and the dropdown the studio offers in
 *       studio/schemas/galleryCategories.ts. Any two of them can drift
 *       apart without a single error until a photo turns up in a
 *       category the site cannot render. So all three are read and
 *       compared before anything else happens.
 *
 *    2. Fetches the published gallery and turns it into the shape
 *       lib/content.ts already serves — src, alt, caption, category,
 *       featured, width, height, thumb — and writes it to
 *       content/gallery.generated.json. The site reads that file, not
 *       the network; see below.
 *
 *    3. Fails the build, naming the photo, on anything an editor can do
 *       that a page cannot survive: no alt text, a category that is not
 *       real, the same photograph twice, an image with no dimensions.
 *
 *  ── WHY ALT TEXT IS CHECKED HERE WHEN THE FIELD IS ALREADY REQUIRED ─
 *
 *  Because "required" in a CMS means the studio's form would not let
 *  you press Publish. It does not mean the dataset cannot contain a
 *  photo with no alt text: an import script, the CLI, a token and curl,
 *  or a schema that was laxer last year all write straight to the API,
 *  which does not run the studio's validation rules.
 *
 *  A build that stops and says *which photograph* is missing its alt
 *  text is worth more than a form that was strict at the time. This is
 *  the check that cannot be bypassed, so this is the one that counts.
 *
 *  ── WHY THE FETCHED DATA IS COMMITTED ───────────────────────────────
 *
 *  content/gallery.generated.json is generated AND in git. That is
 *  deliberate, and it buys three things:
 *
 *    · The site builds without credentials — `npm install && npm run
 *      build` on a laptop or in CI produces the real gallery. Contrast
 *      with a build that needs a token to render its own home page.
 *    · Every publish shows up as a reviewable diff: which photo moved,
 *      what the caption used to say. The git-backed CMS this replaced
 *      gave that for free and it was the best thing about it.
 *    · It is the record. If the Sanity project is ever lost, the
 *      gallery is still here, down to the alt text.
 *
 *  What it is NOT is a fallback for a failed fetch. If this build is
 *  configured to talk to Sanity and cannot, it fails — shipping the
 *  previous gallery while reporting success is how a site quietly stops
 *  reflecting what the office published. Cloudflare keeps the last
 *  good deployment live in the meantime, which is the correct
 *  behaviour and does not require lying about it here.
 *
 *  Run by `npm run build` and `npm run dev`. Also `npm run gallery`.
 * ════════════════════════════════════════════════════════════════════
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createImageUrlBuilder } from "@sanity/image-url";
import { loadEnvFile } from "./env-file.mjs";

// Before anything reads SANITY_*: a real environment variable still
// wins, this only fills in what .env.local holds. See env-file.mjs.
loadEnvFile();

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = resolve(HERE, "..");
const REPO = resolve(SITE, "..");

const DERIVED_PATH = join(SITE, "content", "gallery.generated.json");
const GALLERY_TS = join(SITE, "content", "gallery.ts");
const TYPES_TS = join(SITE, "content", "types.ts");
const STUDIO_CATEGORIES = join(
  REPO,
  "studio",
  "schemas",
  "galleryCategories.ts"
);

/** The document the studio edits. There is exactly one. */
const GALLERY_ID = "gallery";
const API_VERSION = "2024-10-01";

/**
 * The widest the gallery ever needs a photograph.
 *
 * The lightbox is capped at 1000px of layout width, so 1600 covers it
 * on a 2x display with room to spare. Asking for more would be paying
 * for pixels no screen renders; asking the CDN for less than the
 * original is the entire reason the images moved off the repository,
 * where a 12MB phone photo was a 12MB download.
 */
const FULL_WIDTH = 1600;

/** The grid paints a 4:3 tile. These are the numbers in Lightbox.tsx. */
const TILE = { width: 640, height: 480 };

/* ── The categories, from all three places that know them ─────────── */

/**
 * Read a list of category ids out of a TypeScript source file.
 *
 * Parsed rather than imported because two of these files are TypeScript
 * that this script cannot execute, and the third belongs to a different
 * npm package with its own dependency tree. A regex over a list of
 * string literals is the cheap, honest tool for a file whose shape is
 * fixed and commented to say so.
 */
function idsFrom(file, pattern) {
  if (!existsSync(file)) return null;
  const src = readFileSync(file, "utf8");
  const found = [...src.matchAll(pattern)].map((m) => m[1]);
  return found.length ? new Set(found) : null;
}

/** `{ id: "category-one", label: ... }` in content/gallery.ts. */
const idsFromGalleryTs = () => idsFrom(GALLERY_TS, /\bid:\s*"([a-z-]+)"/g);

/** `{ id: "category-one", title: ... }` in the studio's mirror. */
const idsFromStudio = () => idsFrom(STUDIO_CATEGORIES, /\bid:\s*"([a-z-]+)"/g);

/**
 * The `GalleryCategory` union in content/types.ts.
 *
 * Narrowed to that one declaration rather than every quoted string in
 * the file, which is full of them.
 */
function idsFromTypesTs() {
  if (!existsSync(TYPES_TS)) return null;
  const src = readFileSync(TYPES_TS, "utf8");
  const block = src.match(/export type GalleryCategory\s*=([^;]+);/);
  if (!block) return null;
  const found = [...block[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
  return found.length ? new Set(found) : null;
}

/**
 * The studio is optional in this template: a repo with no studio/ at
 * all runs the gallery off the committed JSON and has no CMS dropdown
 * to drift. Its list joins the comparison the moment studio/ exists —
 * and from then on a missing schema file is a failure, per below,
 * because a studio that is present but unreadable is exactly the drift
 * this check exists for.
 */
const HAS_STUDIO = existsSync(join(REPO, "studio"));

const SOURCES = [
  ["content/gallery.ts", idsFromGalleryTs],
  ["content/types.ts", idsFromTypesTs],
  ...(HAS_STUDIO
    ? [["studio/schemas/galleryCategories.ts", idsFromStudio]]
    : []),
];

/**
 * Every list of categories has to be the same list.
 *
 * Returns the agreed set, or null with the disagreement reported. A
 * missing file is a failure, not a skip: "the studio's schema was not
 * where I looked, so I did not check" is how the two halves of this
 * end up disagreeing for a month.
 */
function agreedCategories(errors) {
  const lists = [];
  for (const [name, read] of SOURCES) {
    const ids = read();
    if (!ids) {
      errors.push(
        `could not read the category list from ${name}. ` +
          `The build cannot confirm the studio and the site agree, ` +
          `so it stops here rather than guessing.`
      );
      return null;
    }
    lists.push([name, ids]);
  }

  const [, reference] = lists[0];
  let agreed = true;
  for (const [name, ids] of lists.slice(1)) {
    const missing = [...reference].filter((c) => !ids.has(c));
    const extra = [...ids].filter((c) => !reference.has(c));
    if (missing.length || extra.length) {
      agreed = false;
      errors.push(
        `${name} disagrees with ${lists[0][0]} about the categories` +
          (missing.length ? `\n        missing from ${name}: ${missing.join(", ")}` : "") +
          (extra.length ? `\n        only in ${name}: ${extra.join(", ")}` : "")
      );
    }
  }
  return agreed ? reference : null;
}

/* ── Fetching ─────────────────────────────────────────────────────── */

/**
 * What the build asks Sanity for.
 *
 * `_id == "gallery"` and not `drafts.gallery`: a static export renders
 * what the office published, and a draft is by definition not that.
 * `perspective=published` below says the same thing to the API, so the
 * intent is visible in the request as well as in the filter.
 */
const QUERY = `*[_type == "gallery" && _id == "${GALLERY_ID}"][0]{
  "shots": shots[]{
    alt, caption, category, featured,
    "ref": image.asset._ref,
    "hotspot": image.hotspot,
    "crop": image.crop,
    "dimensions": image.asset->metadata.dimensions
  }
}`;

async function fetchGallery({ projectId, dataset, token }) {
  // api, not apicdn. The CDN host serves a cached answer for up to a
  // minute, and this build was started by a webhook that fired the
  // instant somebody pressed Publish — a cached read here would be a
  // deploy that ships the version before the one that triggered it,
  // intermittently, which is the worst kind of bug to be told about.
  const url =
    `https://${projectId}.api.sanity.io/v${API_VERSION}/data/query/` +
    `${encodeURIComponent(dataset)}?perspective=published&query=` +
    encodeURIComponent(QUERY);

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const hint =
      res.status === 401 || res.status === 403
        ? ` — the dataset is private and SANITY_READ_TOKEN is ${
            token ? "not accepted" : "not set"
          }`
        : "";
    throw new Error(`Sanity returned ${res.status} ${res.statusText}${hint}`);
  }
  const body = await res.json();
  if (!body.result) {
    throw new Error(
      `no "${GALLERY_ID}" document in dataset "${dataset}". ` +
        `If the project is new, run the import: see docs/GALLERY-CMS.md.`
    );
  }
  return Array.isArray(body.result.shots) ? body.result.shots : [];
}

/* ── Turning a Sanity record into a Photo ─────────────────────────── */

/**
 * The delivered pixel size of a URL the builder produced.
 *
 * Not the asset's own dimensions: an editor's crop changes the shape of
 * what is served, and width/height exist to reserve the right box.
 * Taking the numbers from the asset would reserve the box for a photo
 * nobody is being sent. The crop rectangle is in the URL the builder
 * just wrote, which is the only place the two are guaranteed to agree.
 */
function deliveredSize(url, asset) {
  const rect = new URL(url).searchParams.get("rect");
  const [, , rw, rh] = rect
    ? rect.split(",").map(Number)
    : [0, 0, asset.width, asset.height];
  const sourceW = rw > 0 ? rw : asset.width;
  const sourceH = rh > 0 ? rh : asset.height;
  const width = Math.min(FULL_WIDTH, sourceW);
  return { width, height: Math.round((sourceH * width) / sourceW) };
}

function toPhoto(shot, builder) {
  const image = {
    _type: "image",
    asset: { _type: "reference", _ref: shot.ref },
    ...(shot.hotspot ? { hotspot: shot.hotspot } : {}),
    ...(shot.crop ? { crop: shot.crop } : {}),
  };
  const asset = shot.dimensions ?? {};

  // Two renditions of the same photograph, both from the CDN, both
  // honouring whatever crop and focal point the editor set. `auto=format`
  // is what makes this worth doing at all: the same URL serves AVIF or
  // WebP to a browser that accepts one and the original JPEG to a
  // browser that does not.
  const full = builder
    .image(image)
    .width(Math.min(FULL_WIDTH, asset.width || FULL_WIDTH))
    .quality(78)
    .auto("format")
    .url();

  const thumb = builder
    .image(image)
    .width(TILE.width)
    .height(TILE.height)
    .fit("crop")
    .quality(72)
    .auto("format")
    .url();

  const { width, height } = deliveredSize(full, asset);

  const photo = {
    src: full,
    alt: typeof shot.alt === "string" ? shot.alt : "",
    category: shot.category,
    width,
    height,
    // Always present now, where it used to depend on whether somebody
    // had generated a 640x480 beside the original. The CDN crops on
    // request, so every photo gets the light version of itself and the
    // build log no longer has a list of the ones that did not.
    thumb,
  };
  if (shot.caption) photo.caption = shot.caption;
  if (shot.featured) photo.featured = true;
  return photo;
}

/* ── Validation ───────────────────────────────────────────────────── */

/**
 * How a photograph is named in an error message.
 *
 * There is no filename to quote any more — the src is a CDN URL with a
 * content hash in it, which identifies the photo to a machine and to
 * nobody else. So: its position in the list, which is where the editor
 * will look, plus its caption or its alt text, which is what they will
 * recognise. The asset id is last, for the case where the entry has
 * neither and somebody has to find it in Vision.
 */
function label(shot, i) {
  const human = shot.caption || (typeof shot.alt === "string" && shot.alt.trim());
  return `photo ${i + 1}${human ? ` (“${String(human).slice(0, 60)}”)` : ""}${
    human ? "" : ` [${shot.ref ?? "no image"}]`
  }`;
}

function validate(shots, categories, errors) {
  const seen = new Map();

  shots.forEach((shot, i) => {
    const where = label(shot, i);

    if (!shot.ref) {
      errors.push(`${where}: has no photograph attached.`);
      return;
    }

    // The reason the gallery exists. A photo with no alt text is
    // invisible to a screen reader and to Google Images, which for a
    // contractor is a real source of work.
    if (typeof shot.alt !== "string" || shot.alt.trim().length < 3) {
      errors.push(
        `${where}: needs alt text describing what is in the frame. ` +
          `It is what a screen reader reads and what Google Images indexes.`
      );
    }

    if (!categories.has(shot.category)) {
      errors.push(
        `${where}: category ${JSON.stringify(shot.category)} is not one of ` +
          `${[...categories].join(", ")}`
      );
    }

    // The same photograph twice renders twice, and in a lightbox that
    // steps through the set it reads as the arrows having stuck.
    if (seen.has(shot.ref)) {
      errors.push(`${where}: the same photograph as photo ${seen.get(shot.ref)}.`);
    } else {
      seen.set(shot.ref, i + 1);
    }

    const d = shot.dimensions;
    if (!d || !(d.width > 0) || !(d.height > 0)) {
      errors.push(
        `${where}: Sanity reports no pixel dimensions for this asset, so ` +
          `the grid cannot reserve its box. Re-upload the image.`
      );
    }
  });
}

/* ── Reading and writing the committed snapshot ───────────────────── */

function readSnapshot() {
  if (!existsSync(DERIVED_PATH)) return null;
  try {
    const raw = JSON.parse(readFileSync(DERIVED_PATH, "utf8"));
    return Array.isArray(raw.shots) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Write only when something changed.
 *
 * No timestamp in the file, on purpose: a generated file that changes
 * on every build is a file whose diff means nothing, and the whole
 * point of committing this one is that its diff means "the gallery
 * changed, here is how".
 */
function writeSnapshot(snapshot, previous) {
  const next = JSON.stringify(snapshot, null, 2) + "\n";
  const before = previous ? JSON.stringify(previous, null, 2) + "\n" : "";
  if (next === before) return false;
  writeFileSync(DERIVED_PATH, next);
  return true;
}

/* ── The run ──────────────────────────────────────────────────────── */

export async function run(env = process.env) {
  const errors = [];

  const categories = agreedCategories(errors);
  if (!categories) {
    console.error(
      `[gallery] the category lists do not agree:\n` +
        errors.map((e) => `      · ${e}`).join("\n") +
        `\n      Fix them in step: the union in content/types.ts, the labels` +
        `\n      in content/gallery.ts` +
        (HAS_STUDIO
          ? `, and the studio dropdown in\n      studio/schemas/galleryCategories.ts.`
          : `.`)
    );
    return false;
  }

  const projectId = (env.SANITY_PROJECT_ID ?? "").trim();
  const dataset = (env.SANITY_DATASET ?? "production").trim();
  const token = (env.SANITY_READ_TOKEN ?? "").trim() || null;

  const previous = readSnapshot();
  let shots = null;
  let snapshot = null;

  if (projectId) {
    let raw;
    try {
      raw = await fetchGallery({ projectId, dataset, token });
    } catch (err) {
      console.error(
        `[gallery] could not read the gallery from Sanity: ${err.message}\n` +
          `      This build is configured to fetch (SANITY_PROJECT_ID is set),\n` +
          `      so it stops rather than shipping content/gallery.generated.json\n` +
          `      as if it were current. The last good deployment stays live.`
      );
      return false;
    }

    const builder = createImageUrlBuilder({ projectId, dataset });
    validate(raw, categories, errors);
    if (errors.length) {
      console.error(
        `[gallery] ${errors.length} problem${errors.length === 1 ? "" : "s"} ` +
          `in the published gallery:\n` +
          errors.map((e) => `      · ${e}`).join("\n") +
          `\n      Fix them in the studio and publish again.`
      );
      return false;
    }

    shots = raw.map((shot) => toPhoto(shot, builder));
    snapshot = {
      generatedBy:
        "scripts/gallery.mjs — do not edit by hand; run `npm run gallery`",
      source: `sanity:${projectId}/${dataset}`,
      shots,
    };

    const changed = writeSnapshot(snapshot, previous);
    console.log(
      `[gallery] fetched ${shots.length} photos from sanity:${projectId}/${dataset}` +
        (changed ? " — content/gallery.generated.json updated" : " — unchanged")
    );
  } else {
    // No project configured: this is a laptop, or CI, or a preview
    // build with no secrets. The committed snapshot is the gallery, and
    // it is checked exactly as hard as a fresh fetch would be.
    if (!previous) {
      console.error(
        `[gallery] SANITY_PROJECT_ID is not set and ${DERIVED_PATH} is\n` +
          `      missing or unreadable, so there is no gallery to build.\n` +
          `      See docs/GALLERY-CMS.md.`
      );
      return false;
    }
    snapshot = previous;
    // Validated in the fetched shape, so one set of rules covers both
    // paths. A snapshot that would fail as a fetch fails here too.
    validate(
      previous.shots.map((s) => ({
        ...s,
        ref: s.src,
        dimensions: { width: s.width, height: s.height },
      })),
      categories,
      errors
    );
    if (errors.length) {
      console.error(
        `[gallery] ${errors.length} problem${errors.length === 1 ? "" : "s"} ` +
          `in ${DERIVED_PATH}:\n` +
          errors.map((e) => `      · ${e}`).join("\n")
      );
      return false;
    }
    shots = previous.shots;
    console.log(
      `[gallery] SANITY_PROJECT_ID is not set — using the committed ` +
        `gallery (${shots.length} photos).\n` +
        `      This is the right thing on a laptop and in CI. A production\n` +
        `      build should set it, or it cannot see what the office published.`
    );
  }

  const featured = shots.filter((s) => s.featured).length;
  const byCategory = [...categories]
    .map((c) => `${c} ${shots.filter((s) => s.category === c).length}`)
    .join(", ");
  console.log(
    `[gallery] ${shots.length} photos, all present and described — ` +
      `${featured} on the home page · ${byCategory}`
  );
  return true;
}

if (process.argv[1] && process.argv[1].endsWith("gallery.mjs")) {
  process.exit((await run()) ? 0 : 1);
}
