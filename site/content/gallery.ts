import type { GalleryCategory, GalleryShot } from "./types";
import generated from "./gallery.generated.json";

/**
 * ════════════════════════════════════════════════════════════════════
 *  RECENT WORK — every photo, in one place.
 *
 *  This is the single source for both the home page band and the
 *  gallery page: the band shows the ones marked `featured`, the page
 *  shows all of them. Before, the two were separate lists, which meant
 *  the "full gallery" could end up missing the photos on the home page.
 *
 *  Alt text describes what is actually visible in the frame. These
 *  should be the client's own job photographs — no stock, and nothing
 *  captioned as something it isn't.
 *
 *  ── WHERE THE PHOTOS COME FROM ──────────────────────────────────────
 *
 *  They used to be an array literal in this file, then a JSON file a
 *  git-backed CMS committed to this repository. They are now a document
 *  in Sanity, fetched at build time by scripts/gallery.mjs and written
 *  to content/gallery.generated.json, which this file imports.
 *
 *  The move off git was not about the editing model — committing every
 *  change was the best thing about the old one, and the generated file
 *  is committed precisely to keep it. It was about who can edit. A
 *  git-backed CMS signs in with GitHub, so every person in the office
 *  who might add a job photo needed a GitHub account with write access
 *  to this repository. That is a real thing to ask of a small
 *  business, and it is the reason the gallery sat unedited.
 *
 *  ── WHAT STAYS HERE, AND WHY ────────────────────────────────────────
 *
 *  Categories. They are a TypeScript union used across the site, each
 *  one points at a route that has to exist — a set that changes when
 *  the business changes, not when a photo is added. A CMS must never be
 *  able to invent one.
 *
 *  So the studio offers them as a fixed dropdown, from its own copy in
 *  studio/schemas/galleryCategories.ts, and scripts/gallery.mjs reads
 *  all three lists — that one, the union in ./types, and this array —
 *  on every build and fails if any of them disagree.
 *
 *  ── AND THE DIMENSIONS ──────────────────────────────────────────────
 *
 *  Every photo needs its intrinsic width and height so the grid can
 *  reserve the box before the image decodes. These used to be read out
 *  of each JPEG's header by the build, because the file on disk was the
 *  only thing that knew. Sanity records them on the asset, so they now
 *  arrive with the photo — as the size of the rendition actually being
 *  served, crop included, not the size of the original upload.
 * ════════════════════════════════════════════════════════════════════
 */

export const galleryCategories: {
  id: GalleryCategory;
  label: string;
  /** The service this work belongs to, for the way onward */
  service?: string;
}[] = [
  // TODO(client): one entry per GalleryCategory in ./types.ts, and per
  // entry in studio/schemas/galleryCategories.ts. All three lists must
  // agree or `npm run gallery` fails the build.
  {
    id: "category-one",
    label: "Category one",
    service: "/services/service-one/",
  },
  { id: "category-two", label: "Category two" },
  { id: "category-three", label: "Category three" },
];

const CATEGORY_IDS = new Set<string>(galleryCategories.map((c) => c.id));

/**
 * Keep a photo, or drop it and say why.
 *
 * ── WHY THIS DROPS RATHER THAN THROWS ───────────────────────────────
 *
 * scripts/gallery.mjs is the loud half of this: it runs before the
 * build, checks the same rules against what Sanity actually returned,
 * and fails with a message naming the photo. That is where a bad edit
 * is meant to be caught, because a build that stops with an
 * explanation is a five-minute problem.
 *
 * This is the quiet half, and it exists for the case where the loud one
 * did not run. A marketing hire publishing a photo at 4pm should not be
 * able to take down /gallery/ — or the home page, which renders the
 * featured subset — with a missing alt attribute. One photo silently
 * absent is recoverable; a page that throws while rendering is not.
 *
 * The two together mean the ordinary path is "the build tells you",
 * and the worst path is "one photo is missing until someone looks".
 */
function usable(shot: unknown, index: number): shot is GalleryShot {
  const s = shot as Partial<GalleryShot> | null;
  const fail = (why: string) => {
    // Visible in the build log and in the dev console, silent in a
    // production browser — there is no user-facing action to take.
    console.warn(
      `[gallery] photo ${index + 1} (${
        (s && (s.caption || s.alt)) || "no caption"
      }) dropped: ${why}`
    );
    return false;
  };

  if (!s || typeof s !== "object") return fail("not an object");
  // Either a rendition on Sanity's CDN, or a file in public/. The
  // second is what the gallery looked like before the migration and is
  // still the right answer for a snapshot taken before the import ran.
  if (
    typeof s.src !== "string" ||
    !(s.src.startsWith("https://cdn.sanity.io/") || s.src.startsWith("/"))
  ) {
    return fail("src must be a Sanity CDN URL or a path starting with /");
  }
  // Alt text is not decoration. A photo with none is invisible to a
  // screen reader and to Google Images, which is most of the reason a
  // contractor keeps a gallery at all.
  if (typeof s.alt !== "string" || s.alt.trim().length < 3) {
    return fail("alt text is missing");
  }
  if (typeof s.category !== "string" || !CATEGORY_IDS.has(s.category)) {
    return fail(`category "${s.category}" is not one of the ones defined here`);
  }
  // Without these the browser cannot reserve the box, so every image
  // below this one jumps as it decodes. One missing photo is a smaller
  // fault than a gallery that shudders its way down the page.
  if (!(Number(s.width) > 0) || !(Number(s.height) > 0)) {
    return fail("no pixel dimensions — run `npm run gallery`");
  }
  return true;
}

export const gallery: GalleryShot[] = (
  generated.shots as unknown[]
).filter(usable);
