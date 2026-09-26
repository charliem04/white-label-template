/**
 * ════════════════════════════════════════════════════════════════════
 *  CONTENT LOADER — the boundary.
 *
 *  Pages and components import from here, never from content/* directly.
 *  Today these are synchronous reads of typed modules bundled at build
 *  time. Swapping in a CMS (Sanity, Decap, a headless API fetched at
 *  build) means rewriting this file and nothing else — every consumer
 *  already speaks the types in content/types.ts.
 *
 *  If you add a getter, keep it returning the shapes in types.ts. A
 *  getter that returns "whatever the CMS gave me" moves the CMS's shape
 *  into thirty components and undoes the point of the boundary.
 *
 *  ── WHAT IS HERE, AND WHAT YOU ADD ──────────────────────────────────
 *
 *  The template ships the four content domains the shipped components
 *  actually read: services (which the route registry derives the nav
 *  from), gallery, the contact page and careers. Everything the site
 *  this was extracted from also had — areas, team, reviews, case
 *  studies, financing, video — followed exactly this pattern: a typed
 *  module in content/, a getter here, and nothing else importing it.
 *  Add them back the same way.
 * ════════════════════════════════════════════════════════════════════
 */
import { services, servicesHub } from "@/content/services";
import { contactPage } from "@/content/contact";
import { gallery, galleryCategories } from "@/content/gallery";
import { careersPage } from "@/content/careers";
import type { GalleryShot, ServicePage } from "@/content/types";

/* ── Services ─────────────────────────────────────────────────────── */

export function getServicesHub() {
  return servicesHub;
}

export function getServices(): ServicePage[] {
  return services;
}

export function getService(slug: string): ServicePage | undefined {
  return services.find((s) => s.slug === slug);
}

export function getServiceSlugs(): string[] {
  return services.map((s) => s.slug);
}

/* ── Contact ──────────────────────────────────────────────────────── */

export function getContactPage() {
  return contactPage;
}

/* ── Gallery ──────────────────────────────────────────────────────── */

export function getGallery(): GalleryShot[] {
  return gallery;
}

/**
 * The home band shows a subset. Marked in the CMS rather than being
 * "the first eight", so reordering the gallery does not silently
 * change what the home page leads with.
 */
export function getFeaturedGallery(): GalleryShot[] {
  return gallery.filter((shot) => shot.featured);
}

/**
 * Only the categories that actually have photographs in them. A filter
 * chip that returns an empty grid is a bug the visitor has to discover
 * by pressing it.
 */
export function getGalleryCategories() {
  const present = new Set(gallery.map((shot) => shot.category));
  return galleryCategories.filter((c) => present.has(c.id));
}

/* ── Careers ──────────────────────────────────────────────────────── */

export function getCareersPage() {
  return careersPage;
}
