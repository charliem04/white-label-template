import type { CtaCopy, PageMeta, Photo } from "./types";

/**
 * The /contact/ page's own content. Everything a visitor needs to reach
 * the business lives on one page — the phone, the urgent line, the
 * request form and the calendar embed — because CTA_HREF in
 * lib/routes.ts points every primary button here.
 */
export const contactPage = {
  meta: {
    // scripts/seo.mjs enforces 60/160 against the RENDERED output, so
    // check the length after the site name is appended.
    title: "Contact — Book a Free Assessment", // TODO(client)
    description:
      "Call, text or book a free assessment. Office hours, address and the request form.", // TODO(client)
    path: "/contact/",
  } satisfies PageMeta,

  heading: "Talk to us", // TODO(client)
  lede: "", // TODO(client)

  photo: {
    src: "/brand/photo.svg",
    alt: "", // TODO(client) — describe what is in the frame
    width: 1000,
    height: 1333,
  } satisfies Photo,

  booking: {
    heading: "Pick your own time",
    lede: "Choose a slot and we'll confirm by text — no phone tag.",
  },

  cta: {
    heading: "", // TODO(client)
    body: "", // TODO(client)
  } satisfies CtaCopy,
};
