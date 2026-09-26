/**
 * ════════════════════════════════════════════════════════════════════
 *  CONTENT TYPES — the shapes every page reads through lib/content.ts
 *
 *  These types are the contract between content and components. A CMS
 *  added later (Decap, Sveltia, Sanity) has to produce these shapes;
 *  nothing in app/ or components/ should ever import a content module
 *  directly, only the loader.
 * ════════════════════════════════════════════════════════════════════
 */

export type Photo = {
  src: string;
  alt: string;
  /** Intrinsic pixels, so the box is reserved before the photo lands */
  width: number;
  height: number;
  caption?: string;
  /**
   * A pre-cropped 640x480 to paint in the grid, when one has been
   * generated for this photo. Absent means there is none and the tile
   * should use the full-size original — which is heavier, and is the
   * only correct answer, because the alternative is a 404 where a
   * photograph should be.
   *
   * Filled in by scripts/gallery.mjs from what is actually on disk.
   */
  thumb?: string;
};

/**
 * Filters on the gallery page, each mapping to a service.
 *
 * TODO(client): this union is the master list. It is duplicated, on
 * purpose, in two other places — content/gallery.ts (the labels and
 * service routes) and studio/schemas/galleryCategories.ts (the dropdown
 * the CMS offers). scripts/gallery.mjs reads all three on every build
 * and FAILS if any of them disagree, so a category can never exist in
 * the CMS that the site cannot render. Edit all three together.
 */
export type GalleryCategory =
  | "category-one"
  | "category-two"
  | "category-three";

export type GalleryShot = Photo & {
  category: GalleryCategory;
  /** Shown in the home page band as well as the gallery page */
  featured?: boolean;
};

export type Faq = {
  q: string;
  a: string;
};

/** The CTA band that closes every page, in that page’s own words. */
export type CtaCopy = {
  heading: string;
  body: string;
};

/** Per-page <head> content. */
export type PageMeta = {
  title: string;
  description: string;
  /** Path with leading and trailing slash, e.g. "/services/service-one/" */
  path: string;
};

/**
 * A block of content the client still owes us. Rendered as an honest,
 * obviously-unfinished panel rather than filled with invented copy.
 */
export type PendingContent = {
  /** What is missing, in the client’s language */
  needs: string;
  /** Who has to supply it */
  from?: string;
};

/**
 * The inline icon set in components/Icon.tsx. Add an icon there and its
 * name here together; a service can then pick it by name.
 */
export type IconName =
  | "wrench"
  | "bolt"
  | "flame"
  | "droplet"
  | "gauge"
  | "shield"
  | "truck"
  | "clock";

export type ServiceSection = {
  heading: string;
  body?: string[];
  /** Tick-list columns; one column reads as a list, two as a spec sheet */
  columns?: { label?: string; items: string[] }[];
};

export type ServicePage = {
  slug: string;
  /** Nav and breadcrumb label — shorter than the page title */
  navLabel: string;
  meta: PageMeta;
  /** Compact interior hero */
  heading: string;
  lede: string;
  photo: Photo;
  /** Short summary used on the services hub and the home cards */
  summary: string;
  /** Marks the line on the home page's services list. Optional. */
  icon?: IconName;
  /** Home/hub grid width: 7 of 12, 5 of 12, or the full row */
  span: "wide" | "narrow" | "full";
  sections: ServiceSection[];
  faqs: Faq[];
  cta: CtaCopy;
  /** Slugs of gallery photos to show as related work */
  workCaptions?: string[];
};
