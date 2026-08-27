/**
 * ════════════════════════════════════════════════════════════════════
 *  CLIENT CONFIG — the ONLY file you should need to edit per client
 *  (plus swapping images in /public and setting .env.local).
 *
 *  Every component reads from this file. If you find yourself editing
 *  a component to change client content, that content belongs here.
 *  See README-DEPLOY.md for the full go-live checklist.
 * ════════════════════════════════════════════════════════════════════
 */

export type Service = {
  icon: IconName;
  title: string;
  description: string;
};

export type Testimonial = {
  quote: string;
  name: string;
  detail: string; // e.g. "Homeowner, Broussard" or "Fleet manager"
};

export type IconName =
  | "wrench"
  | "bolt"
  | "flame"
  | "droplet"
  | "gauge"
  | "shield"
  | "truck"
  | "clock";

export const client = {
  // ── Identity ──────────────────────────────────────────────────────
  businessName: "Acme Mechanical", // TODO(client)
  legalName: "Acme Mechanical LLC", // TODO(client) — used in legal pages
  tagline: "Heating, cooling & repair done right the first time",
  // Short positioning line used in the hero subheadline + meta description
  subheadline:
    "Licensed, insured, and local. Same-week scheduling, upfront pricing, and work that's guaranteed in writing.",
  logoPath: "/placeholder/logo.svg", // TODO(client) — drop real logo in /public

  // ── Domain / SEO ──────────────────────────────────────────────────
  siteUrl: "https://example.com", // TODO(client) — no trailing slash
  metaTitle: "Acme Mechanical — HVAC Repair & Installation", // TODO(client)
  metaDescription:
    "Local HVAC repair, installation, and maintenance. Licensed and insured, upfront pricing, same-week scheduling.", // TODO(client)
  ogImagePath: "/placeholder/og.svg", // TODO(client) — 1200×630 recommended

  // ── Contact ───────────────────────────────────────────────────────
  phone: "(337) 555-0142", // TODO(client)
  phoneHref: "+13375550142", // TODO(client) — E.164, used for tel:/sms: links
  email: "office@example.com", // TODO(client)
  address: {
    street: "123 Industry Rd",
    city: "Lafayette",
    region: "LA",
    postalCode: "70501",
  }, // TODO(client)
  hours: [
    { days: "Mon–Fri", time: "7:00 AM – 6:00 PM" },
    { days: "Saturday", time: "8:00 AM – 2:00 PM" },
    { days: "Sunday", time: "Emergency calls only" },
  ],
  /**
   * Google Maps embed URL. Get it from Maps → Share → Embed a map,
   * and paste ONLY the src attribute value here. Empty string = a
   * neutral placeholder panel renders instead of an iframe.
   */
  mapEmbedSrc: "", // TODO(client)

  // ── Booking ───────────────────────────────────────────────────────
  /**
   * Cal.com link in "username/event" form, e.g. "acme-hvac/estimate".
   * Empty string hides the booking section entirely.
   */
  calLink: "demo/30min", // TODO(client)

  // ── Socials (empty string hides the link) ─────────────────────────
  socials: {
    facebook: "", // TODO(client)
    instagram: "", // TODO(client)
    google: "", // TODO(client) — Google Business Profile review link
  },

  // ── Services (3–6 reads best; grid adapts to count) ───────────────
  services: [
    {
      icon: "flame",
      title: "Heating repair",
      description:
        "Furnace and heat-pump diagnostics and repair, with parts stocked on the truck for same-visit fixes.",
    },
    {
      icon: "droplet",
      title: "AC installation",
      description:
        "Right-sized system installs with load calculations — not guesswork — and financing options available.",
    },
    {
      icon: "gauge",
      title: "Maintenance plans",
      description:
        "Twice-a-year tune-ups that keep warranties valid and catch small problems before they're weekend emergencies.",
    },
    {
      icon: "clock",
      title: "24/7 emergency",
      description:
        "A real person answers after hours. Emergency dispatch for no-heat and no-cool calls, nights and weekends.",
    },
  ] as Service[], // TODO(client)

  // ── Contact form dropdowns ────────────────────────────────────────
  /**
   * The two <select> fields on the work-order sheet. Both are required,
   * so keep the lists short enough to scan. Order them the way a
   * dispatcher would read them, not alphabetically-for-its-own-sake.
   */
  form: {
    serviceOptions: [
      "AC repair",
      "AC installation",
      "Heating repair",
      "Heating installation",
      "Maintenance / tune-up",
      "Ductwork",
      "Indoor air quality",
      "Emergency — no heat / no cool",
      "Something else",
    ],
    urgencyOptions: [
      "Emergency — ASAP",
      "Within 24 hours",
      "This week",
      "This month",
      "Just planning ahead",
    ],
  }, // TODO(client)

  // ── About ─────────────────────────────────────────────────────────
  about: {
    heading: "A local shop, not a call center",
    body: [
      "Acme Mechanical has served the area since 2004. We're a family-run crew of licensed techs — the person who quotes your job is the person who shows up to do it.",
      "No commissioned upsells, no mystery line items. You get a written price before work starts and a written guarantee after it's done.",
    ], // TODO(client) — 1–3 short paragraphs
    photoPath: "/placeholder/about.svg", // TODO(client) — team/shop photo
    stats: [
      { value: "20+", label: "Years in business" },
      { value: "4,816", label: "Jobs completed" },
      { value: "4.9 / 5", label: "Google rating" },
    ], // TODO(client) — set to [] to hide the stats row
  },

  // ── Testimonials (set to [] to hide the section) ──────────────────
  testimonials: [
    {
      quote:
        "They quoted a price on the phone, showed up on time, and the final bill matched the quote. That's rarer than it should be.",
      name: "Denise B.",
      detail: "Homeowner",
    },
    {
      quote:
        "Our AC died on a Friday in July. They had a tech out that evening and a new unit running by Saturday afternoon.",
      name: "Marcus T.",
      detail: "Homeowner",
    },
    {
      quote:
        "We keep them on a maintenance contract for all three of our shop locations. Zero surprises in two years.",
      name: "Rachel K.",
      detail: "Business owner",
    },
  ] as Testimonial[], // TODO(client)

  // ── Trust badges (license #s, certs — set to [] to hide) ──────────
  badges: [
    "LA License #12345", // TODO(client)
    "Fully insured & bonded",
    "NATE-certified techs",
  ],

  // ── Section copy (headings/CTAs — usually fine as-is) ─────────────
  copy: {
    heroCta: "Get a free estimate",
    heroSecondaryCta: "Call or text",
    servicesHeading: "Services",
    testimonialsHeading: "Word travels",
    bookingHeading: "Book a time that works",
    bookingBlurb:
      "Pick a slot and we'll confirm by text. Prefer to talk? Call or send the form below.",
    contactHeading: "Request an estimate",
    stickyCtaLabel: "Free estimate",
  },
} as const;

export type ClientConfig = typeof client;
