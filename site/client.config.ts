/**
 * ════════════════════════════════════════════════════════════════════
 *  CLIENT CONFIG — the ONLY file you should need to edit per client
 *  (plus swapping images in /public/brand and setting .env.local).
 *
 *  Every component reads from this file. If you find yourself editing
 *  a component to change client content, that content belongs here.
 *
 *  Every value below is a placeholder. Search this file for TODO before
 *  you ship — scripts/check.mjs does not know what a real phone number
 *  looks like, but a visitor does.
 *
 *  Longer-form content (services, gallery, careers, case studies) does
 *  NOT live here. It lives in content/*.ts behind lib/content.ts, so a
 *  CMS can replace it without touching a component. This file is for
 *  the facts about the business and the copy that frames them.
 * ════════════════════════════════════════════════════════════════════
 */

export type Testimonial = {
  quote: string;
  name: string;
  detail: string; // e.g. "Homeowner, Springfield" or "Fleet manager"
};

export const client = {
  // ── Identity ──────────────────────────────────────────────────────
  businessName: "Example Co", // TODO(client)
  legalName: "Example Company LLC", // TODO(client) — legal pages + footer
  /** Hero headline. `emphasis` prints in the accent on its own line. */
  tagline: "First half of the promise.", // TODO(client)
  taglineEmphasis: "Second half.", // TODO(client)
  subheadline:
    "One or two sentences naming what the business does, for whom, and where. This is the only paragraph most visitors read.", // TODO(client)
  logoPath: "/brand/logo.svg", // TODO(client) — real logo in public/brand/
  logoAlt: "Example Co", // TODO(client)

  /**
   * schema.org type for the LocalBusiness JSON-LD in components/JsonLd.tsx.
   *
   * Pick the most specific type that genuinely fits from
   * schema.org/LocalBusiness — "RoofingContractor", "Plumber",
   * "Electrician", "Dentist", "LegalService". Google reads this, and a
   * wrong specific type is worse than a correct general one, so fall
   * back to "LocalBusiness" rather than guessing.
   */
  schemaType: "LocalBusiness", // TODO(client)

  // ── Domain / SEO ──────────────────────────────────────────────────
  siteUrl: "https://www.example.com", // TODO(client) — no trailing slash
  /**
   * scripts/seo.mjs fails the build if a rendered title exceeds 60
   * characters or a description exceeds 160, because that is roughly
   * where Google truncates. Write to the limit, not past it.
   */
  metaTitle: "Example Co — What We Do in Springfield", // TODO(client)
  metaDescription:
    "One sentence a stranger could read in a search result and know whether to click. Name the service, the area, and the next step.", // TODO(client)
  ogImagePath: "/brand/og.svg", // TODO(client) — a 1200×630 JPG; most crawlers ignore SVG

  // ── Contact ───────────────────────────────────────────────────────
  phone: "555-555-0100", // TODO(client) — as printed
  phoneHref: "+15555550100", // TODO(client) — E.164, for tel:/sms: links
  /** Texts. Often the same number, different intent. */
  smsHref: "+15555550100", // TODO(client)
  /**
   * A second line for urgent work, answered outside office hours.
   * Set both to "" to drop every urgent-line affordance on the site.
   */
  urgentPhone: "", // TODO(client) — optional
  urgentPhoneHref: "", // TODO(client) — optional
  email: "office@example.com", // TODO(client)
  address: {
    street: "1 Example Street", // TODO(client)
    city: "Springfield", // TODO(client)
    region: "ST", // TODO(client) — two-letter state/province
    postalCode: "00000", // TODO(client)
  },
  hours: [
    { days: "Monday – Friday", time: "8am – 5pm" },
    { days: "Saturday", time: "Closed" },
    { days: "Sunday", time: "Closed" },
  ], // TODO(client)
  /** Short form of the hours, printed in the utility bar. */
  hoursShort: "Mon–Fri 8–5", // TODO(client)
  /**
   * Google Maps embed URL. Maps → Share → Embed a map, and paste ONLY
   * the src attribute value here. Empty string = the map panel is
   * skipped rather than rendering an empty frame.
   *
   * INTEGRATIONS.frame in scripts/csp.mjs allows https://www.google.com
   * for this. With no map, delete that line too.
   */
  mapEmbedSrc: "",

  // ── Booking ───────────────────────────────────────────────────────
  /**
   * The calendar embedded in the booking band on /contact/, and
   * nothing else. Empty string drops that band (and the scheduler
   * paragraph in the privacy notice) — the page keeps the phone and
   * the request form.
   *
   * It is deliberately NOT where the buttons point. On the site this
   * was extracted from, every primary CTA read this URL, so one config
   * value quietly sent the whole site out to a third party mid-
   * decision. CTAs go to CTA_HREF in lib/routes.ts now, which lands on
   * /contact/ where this calendar lives. Changing the scheduler is a
   * change to one band on one page.
   *
   * The CSP drift check in scripts/csp.mjs fails the build if
   * frame-src does not name this origin, so swapping schedulers
   * announces itself rather than being silently blocked. Add the new
   * origin to INTEGRATIONS.frame there at the same time.
   *
   * Cal.com and Calendly are both already known to lib/booking.ts and
   * allowed in INTEGRATIONS.frame. For Cal.com paste the public booking
   * page URL (https://cal.com/<user>/<event>), not the embed snippet.
   */
  bookingUrl: "", // TODO(client) — e.g. https://cal.com/acme/estimate or https://calendly.com/…

  /**
   * Call tracking. Dynamic number insertion is the provider's own
   * script rewriting numbers in the page at runtime, so this is a URL,
   * not a number. Empty = every number on the site stays the real one
   * above, which is the correct state until a provider is chosen.
   * The script loads only after cookie consent, with the analytics.
   */
  tracking: {
    dniScriptUrl: "", // TODO(client) — e.g. CallRail's swap.js
  },

  // ── Socials (empty string hides the link) ─────────────────────────
  socials: {
    facebook: "",
    /**
     * Meta has no reviews API, so a link is the only route to
     * recommendations — a link, not a feed.
     */
    facebookReviews: "",
    instagram: "",
    /** Leaves a review. Get it from the Google Business Profile. */
    google: "",
  },

  // ── Contact form dropdowns ────────────────────────────────────────
  /**
   * The two <select> fields on the work-order sheet. Urgency is
   * required, so keep both lists short enough to scan. Order them the
   * way a dispatcher would read them, not alphabetically for its own
   * sake — the first service is the pre-selected one.
   */
  form: {
    serviceOptions: [
      "Option one",
      "Option two",
      "Option three",
      "Something else",
    ], // TODO(client)
    urgencyOptions: [
      "Emergency — ASAP",
      "Within 24 hours",
      "This week",
      "This month",
      "Just planning ahead",
    ], // TODO(client)
  },

  // ── About band (home page) ────────────────────────────────────────
  about: {
    heading: "A local shop, not a call center", // TODO(client)
    /** 1–3 short paragraphs, in the client's own words. */
    body: [
      "Who the business is, how long it has been doing this, and who actually shows up to do the work.",
      "What a customer can count on — the written price, the guarantee — stated only as far as the client stands behind it.",
    ], // TODO(client)
    photo: {
      src: "/brand/about.svg",
      alt: "", // TODO(client) — describe what is in the frame
      width: 1200,
      height: 900,
    },
    /**
     * Shop-door facts, printed as a ruled mono line. Real figures only —
     * scripts/check.mjs flags a row of suspiciously round numbers.
     * [] hides the row.
     */
    stats: [] as { value: string; label: string }[], // TODO(client)
    /** Places worked, printed as a mono tag row. [] hides the row. */
    towns: [] as string[], // TODO(client)
  },

  /** Photo printed beside the contact details column. */
  contactPhoto: {
    src: "/brand/photo.svg",
    alt: "", // TODO(client) — describe what is in the frame
    width: 1200,
    height: 652,
  },

  // ── Testimonials (set to [] to hide the section) ──────────────────
  // Real quotes only. A link to the review profile carries this weight
  // until the client supplies quotes cleared for the site.
  testimonials: [] as Testimonial[],

  // ── Trust badges (license #s, certs — set to [] to hide) ──────────
  badges: [] as { label: string; detail?: string }[],

  // ── Section copy (headings/CTAs) ──────────────────────────────────
  copy: {
    utilityBar: "Springfield-based · serving the area since 2019", // TODO(client)
    heroCta: "Schedule a free assessment", // TODO(client)
    heroSecondaryCta: "Call the office",
    heroFacts: [
      { value: "2019", label: "in business" },
      { value: "5-year", label: "labor warranty" },
      { value: "Showroom", label: "in Springfield" },
      { value: "Financing", label: "available" },
    ], // TODO(client)
    navCta: "Free assessment", // TODO(client)
    servicesHeading: "What we do", // TODO(client)
    servicesLede: "", // TODO(client)
    galleryHeading: "Recent work",
    galleryLede: "", // TODO(client)
    testimonialsHeading: "Word travels",
    bookingHeading: "Book a time that works",
    bookingBlurb:
      "Pick a slot and we'll confirm by text. Prefer to talk? Call or send the form below.",
    contactHeading: "Request an assessment", // TODO(client)
    contactLede:
      "Tell us where you are and what you're seeing. We'll call to set a time — usually the same business day.", // TODO(client)
    contactSubmit: "Request my assessment", // TODO(client)
    contactConfirmation:
      "Got it. We'll call you at the number you gave to set a time.", // TODO(client)
    closingHeading: "", // TODO(client)
    closingBody: "", // TODO(client)
    footerBlurb: "", // TODO(client)
    stickyCtaLabel: "Free assessment", // TODO(client)
  },
} as const;

export type ClientConfig = typeof client;
