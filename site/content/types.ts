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

export type Town = {
  slug: string;
  name: string;
  /** County/parish/region, for schema and for copy that sounds local */
  region: string;
};

export type TeamMember = {
  name: string;
  role: string;
  /** One line, in their words */
  line: string;
  photo?: Photo;
};

export type CaseStudy = {
  slug: string;
  title: string;
  town: string;
  /** Groups the study under a region on the areas hub. */
  region?: string;
  /** The service line it belongs to, e.g. "/services/service-one/". */
  service?: string;
  /** ISO date the job completed. Newest first on the index. */
  completed?: string;
  problem: string;
  scope: string;
  materials: string[];
  effort: string;
  result: string;
  /**
   * The pair that does the actual persuading. Both or neither — a
   * lone "after" is just a gallery photo, and a lone "before" is a
   * problem with no answer.
   */
  before?: Photo;
  after?: Photo;
  /** Anything else worth showing: detail shots, materials, the crew. */
  photos: Photo[];
};

export type Review = {
  quote: string;
  name: string;
  /** Town, job type, anything that grounds it. Often we simply do not know. */
  detail?: string;
  /** Where it was left, e.g. "Google" or "Facebook". */
  source: string;
};

export type Post = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  body: string[];
};

/**
 * Financing terms. Every number the estimator prints comes from here —
 * there is no fallback math on invented rates. `offers: []` means the
 * estimator renders the pending panel instead.
 */
export type FinanceOffer = {
  label: string;
  /** Annual percentage rate, e.g. 9.99 */
  apr: number;
  /** Term in months */
  months: number;
  /** Optional note, e.g. "subject to credit approval" */
  note?: string;
};

/**
 * One of the lender's advertised packages, as printed on the card a
 * homeowner clicks.
 *
 * Separate from FinanceOffer on purpose. An offer is something the
 * estimator can do arithmetic on — a principal, a rate and a term that
 * amortise. A product is a thing the lender sells, and not all of them
 * amortise: a same-as-cash package has no monthly payment at all during
 * its promotional window, so there is no honest figure for the
 * estimator to print for it. Keeping the two lists apart is what stops
 * a deferred-interest product being run through a monthly-payment
 * formula that does not describe it.
 */
export type FinanceProduct = {
  /** The rate or term the card leads with, e.g. "9.99% APR". */
  headline: string;
  /** What kind of loan it is, e.g. "5 year loan". */
  name: string;
  /** The condition that materially changes the deal. Shown, not buried. */
  detail?: string;
  /** True when the estimator has a matching entry in `offers`. */
  estimated?: boolean;
  /**
   * This product's own entry point into the lender's portal. Each
   * package has its own loanCode, so these are three different links
   * and not one link repeated — sending someone to the wrong code lands
   * them on the wrong application.
   */
  url: string;
};
