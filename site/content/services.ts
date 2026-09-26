import type { ServicePage } from "./types";

/**
 * ════════════════════════════════════════════════════════════════════
 *  SERVICES — the hub and its child pages.
 *
 *  This file drives more than the service pages themselves. The nav's
 *  Services dropdown, the sitemap entries, the breadcrumbs and the
 *  home-page cards are all derived from it — see serviceChildren in
 *  lib/routes.ts. Adding a service here adds it everywhere; there is no
 *  second list to update, and there must not be.
 *
 *  ── THE COPY RULE, WHICH IS THE IMPORTANT PART ──────────────────────
 *
 *  Nothing in this file asserts anything about the client that the
 *  client has not said about itself. Trade explanation is general and
 *  true; anything operational — warranty length, a showroom, an
 *  after-hours line, a free assessment — traces back to
 *  client.config.ts, where somebody had to type it deliberately.
 *
 *  This is the rule that keeps a white-label template from inventing
 *  credentials for a business. A generated "25 years of experience" on
 *  a five-year-old company is the kind of thing that ends an
 *  engagement.
 * ════════════════════════════════════════════════════════════════════
 */

export const servicesHub = {
  meta: {
    title: "Services", // TODO(client)
    // TODO(client). scripts/seo.mjs enforces 160 characters against the
    // RENDERED output and fails the build on an empty one.
    description:
      "What we do, who we do it for, and how a project runs from first call to final walkthrough.",
    path: "/services/",
  },
  heading: "", // TODO(client)
  lede: "", // TODO(client)
  photo: {
    src: "/brand/photo.svg",
    alt: "", // TODO(client)
    width: 1200,
    height: 652,
  },
  cta: {
    heading: "", // TODO(client)
    body: "", // TODO(client)
  },
};

/**
 * TODO(client): one entry per service page.
 *
 * The example below is complete and typed — copy it, fill it in, and
 * delete the example. An empty array is valid and produces a Services
 * item in the nav with no dropdown, which is the correct state for a
 * site whose service pages are not written yet.
 *
 * `span` is the grid width on the hub and the home cards: "wide" is 7
 * of 12, "narrow" is 5 of 12, "full" is the whole row. Alternate them
 * so the grid has a rhythm rather than a uniform block.
 */
export const services: ServicePage[] = [
  {
    slug: "service-one",
    span: "wide",
    navLabel: "Service one", // shorter than the page title, for the nav
    meta: {
      // scripts/seo.mjs enforces 60/160 on the RENDERED output.
      title: "Service One — What It Is",
      description:
        "What this service is, what it costs to get wrong, and what we do about it.",
      path: "/services/service-one/",
    },
    heading: "",
    lede: "",
    // The card on the hub and the line on the home page. One sentence.
    summary:
      "One sentence on what this service is and who it is for.", // TODO(client)
    icon: "wrench",
    photo: {
      src: "/brand/photo.svg",
      alt: "",
      width: 1600,
      height: 1067,
    },
    sections: [
      {
        heading: "",
        body: [""],
      },
      {
        heading: "",
        // One column reads as a list; two read as a spec sheet.
        columns: [{ label: "", items: [""] }],
      },
    ],
    faqs: [
      // Real questions the office is actually asked. An invented FAQ is
      // obvious to a reader and worthless to search.
      { q: "", a: "" },
    ],
    cta: {
      heading: "",
      body: "",
    },
  },
];
