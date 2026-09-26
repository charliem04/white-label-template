import type { CtaCopy, PageMeta, Photo } from "./types";

/**
 * ════════════════════════════════════════════════════════════════════
 *  CAREERS — the page, the roles, and the questions the form asks.
 *
 *  ── HOW THE FORM ACTUALLY WORKS ─────────────────────────────────────
 *
 *  A static export cannot receive a file, so the résumé upload goes to
 *  workers/careers-upload: a Cloudflare Worker that validates the
 *  upload and writes it to a PRIVATE R2 bucket. Until
 *  NEXT_PUBLIC_CAREERS_ENDPOINT points at a deployed Worker, the form
 *  refuses and sends people to the office email.
 *
 *  That refusal is deliberate and should stay. Somebody applying for a
 *  job has put real work into that document, and a form that appears to
 *  take it and drops it costs them a job they think they applied for.
 *
 *  ── postingsAreLive ─────────────────────────────────────────────────
 *
 *  Separate from the route registry's `live` flag on purpose, and they
 *  answer different questions. `live` in lib/routes.ts decides whether
 *  /careers/ exists and is indexed at all. This decides whether the
 *  page publishes JobPosting structured data for the roles below.
 *
 *  Leave it false until the client has CONFIRMED each role is genuinely
 *  open. Publishing JobPosting schema for a vacancy nobody has
 *  confirmed puts a phantom job into Google for Jobs, and the applicant
 *  who finds it there is the one who pays for it.
 * ════════════════════════════════════════════════════════════════════
 */

export type Role = {
  slug: string;
  title: string;
  /**
   * "Full time", "Seasonal", "Sub-contract" — the client's own words.
   *
   * Optional, and correctly left unset until somebody has said which of
   * these are salaried, seasonal or sub-contract. The card omits the
   * line rather than printing a guess: an applicant deciding whether to
   * apply reads this one, and "Full time" invented for layout's sake is
   * a lie with consequences.
   */
  basis?: string;
  /** Where the work is, when it is not simply the main service area. */
  location?: string;
  summary: string;
  /** What the person actually does day to day. */
  does: string[];
  /** What they must already have. Keep it to the genuine minimum. */
  needs: string[];
};

export type Question = {
  id: string;
  label: string;
  /** "short" is one line; "long" is a paragraph; "choice" is a select. */
  kind: "short" | "long" | "choice";
  options?: string[];
  required?: boolean;
  /** Shown under the field. Use it to explain why we are asking. */
  hint?: string;
};

export const careersPage = {
  meta: {
    title: "Careers — Work Here", // TODO(client)
    description:
      "What we hire for, what the work is, and how to apply. Send a résumé and someone reads it.", // TODO(client)
    path: "/careers/",
  } satisfies PageMeta,

  heading: "Work here", // TODO(client)
  lede: "", // TODO(client)

  photo: {
    src: "/brand/photo.svg",
    alt: "", // TODO(client) — describe what is in the frame
    width: 1600,
    height: 1067,
  } satisfies Photo,

  /** See the header comment. Do NOT flip this on speculatively. */
  postingsAreLive: false,

  rolesHeading: "What we hire for",
  rolesLede: "", // TODO(client)

  /**
   * TODO(client): the roles, in the client's own words. An empty array
   * is a supported state — the page falls back to the openHeading /
   * openBody copy below and still takes applications, which is the
   * right behaviour for a business that hires when the right person
   * turns up rather than against a posted vacancy.
   */
  roles: [] as Role[],

  openHeading: "No posted openings right now",
  openBody:
    "We still want to hear from you. Send something over and we will call if something opens up.", // TODO(client)

  /**
   * The application questions.
   *
   * These are a starting point and every one of them should be read
   * against the actual job before it ships. Two rules worth keeping:
   *
   *  · Ask about the work, not about the person. A question about
   *    whether someone can do a physical task is fair; the same
   *    question aimed at why they might not be is not, and in several
   *    jurisdictions is unlawful.
   *  · If a question needs a reason, put the reason in `hint` where
   *    the applicant can read it. A question whose purpose is invisible
   *    reads as a screen.
   */
  questions: [
    {
      id: "experience",
      label: "How long have you been doing this kind of work?",
      kind: "choice",
      options: [
        "Less than a year",
        "1–3 years",
        "3–7 years",
        "More than 7 years",
      ],
      required: true,
    },
    {
      id: "trades",
      label: "What are you good at?",
      kind: "short",
      required: true,
      hint: "", // TODO(client) — name the actual skills, e.g. "Framing, estimating, driving — whatever fits."
    },
    {
      id: "start",
      label: "When could you start?",
      kind: "short",
      required: false,
    },
    {
      id: "anything",
      label: "Anything else we should know?",
      kind: "long",
      required: false,
    },
  ] satisfies Question[],

  /** Copy around the file field itself. */
  resumeLabel: "Your résumé",
  /**
   * The size and the accepted types here MUST match what the Worker
   * enforces — MAX_UPLOAD_BYTES in workers/careers-upload/wrangler.toml
   * and the extension + magic-byte check in its src/index.ts. A form
   * that promises 10MB against a Worker that refuses above 5 rejects
   * the file after the applicant has waited for the upload.
   *
   * .doc is refused outright: the legacy OLE format is the worst
   * macro-carrier of the three, and Word can Save As PDF.
   */
  resumeHint:
    "PDF or Word (.docx), up to 5MB. Older .doc files are not accepted — open it in Word and use Save As, PDF. If you do not have a résumé written up, attach anything that lists where you have worked; we are not grading it.",

  /** What happens next, so nobody is left wondering. */
  afterHeading: "What happens next",
  after: [
    "Someone in the office reads it — not a filter, a person.",
    "If it looks like a fit we call you, usually within a week.",
    /**
     * This sentence is a PROMISE WITH INFRASTRUCTURE BEHIND IT. The
     * twelve months is the R2 lifecycle rule applied by
     * workers/careers-upload/scripts/set-retention.sh. Change the
     * number here and change it there, or the site is saying something
     * the storage does not do.
     */
    "If it is not a fit right now we keep it on file for a year and call you if something opens up. After that it is deleted automatically — ask sooner and we will delete it sooner.",
  ],

  cta: {
    heading: "Rather just talk?", // TODO(client)
    body: "", // TODO(client)
  } satisfies CtaCopy,
};
