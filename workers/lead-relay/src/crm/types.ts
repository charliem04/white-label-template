/**
 * ════════════════════════════════════════════════════════════════════
 *  THE CRM BOUNDARY — one seam, so the CRM stays a decision and not a
 *  rewrite.
 *
 *  The relay was written before the CRM was chosen, and it forwarded to
 *  a URL in a secret precisely so that choice could be deferred without
 *  losing leads in the meantime. That works for "post this JSON
 *  somewhere", which is what a Zapier catch hook or a no-code mapper
 *  wants. It does not work for a real CRM API, which has its own
 *  endpoints, its own auth, its own idea of what a contact looks like,
 *  and — the part that actually forces this directory to exist —
 *  deduplication rules that need a lookup before the write.
 *
 *  So forwarding is an adapter. Each one owns its request shaping, its
 *  endpoint and its auth; the Worker owns the row, the ordering and the
 *  bookkeeping. Adding JobNimbus or AccuLynx later is one new file next
 *  to this one and one line in ./index.ts, not a change to forward().
 *
 *  ── WHAT AN ADAPTER MAY NOT DO ──────────────────────────────────────
 *
 *  It may not throw, and it may not touch the database. Every outcome
 *  comes back as a CrmOutcome and index.ts records it in one place,
 *  which is what keeps the retry sweep a plain query over crm_status
 *  rather than a queue with its own failure modes.
 *
 *  ── WHY THE IMPORTS CARRY `.ts` ─────────────────────────────────────
 *
 *  esbuild (and therefore wrangler) resolves the literal path, and so
 *  does node. That is what lets `npm test` exercise the pure parts of
 *  an adapter with no build step and no test framework — which matters
 *  here, because the CRM account these adapters talk to does not exist
 *  yet and cannot be integration-tested against.
 * ════════════════════════════════════════════════════════════════════
 */

/* ── The row ────────────────────────────────────────────────────── */

export type LeadKind = "lead" | "application";

/**
 * One record in the lead book, as everything downstream of the insert
 * sees it. Mirrors schema.sql: NULL means "this form does not ask",
 * which is different from empty, and is a distinction adapters are
 * expected to preserve rather than flatten into "".
 */
export type LeadRow = {
  id: string;
  kind: LeadKind;
  received_at: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  service: string | null;
  urgency: string | null;
  message: string | null;
  role: string | null;
  answers: string | null;
  resume_key: string | null;
  source: string | null;
};

/* ── Configuration the adapters read ────────────────────────────── */

export interface CrmEnv {
  /**
   * Which adapter forwards: "generic" (the default) or "hubspot".
   *
   * An unrecognised value is treated as no CRM at all rather than
   * quietly falling back, because a typo here would otherwise throw
   * every lead at whatever CRM_WEBHOOK_URL happens to hold. Rows are
   * stored 'disabled' instead, and the sweep delivers the backlog once
   * the spelling is fixed.
   */
  CRM_ADAPTER?: string;

  /**
   * Where the `generic` adapter forwards. Unset is a supported state,
   * not a misconfiguration: rows are stored with crm_status='disabled'
   * and /export.csv is how they get into whatever is chosen later.
   */
  CRM_WEBHOOK_URL?: string;

  /**
   * Where the `generic` adapter sends kind='application' rows, when
   * they should not go where customer leads go. Unset, applications
   * follow CRM_WEBHOOK_URL, which is the behaviour this Worker has
   * always had.
   *
   * Set it and applicants stop landing in a sales CRM's contact list.
   * That is worth doing for two unrelated reasons: a free CRM tier has
   * a contact cap that job applicants will quietly burn through, and an
   * applicant carries different retention obligations from a customer —
   * the privacy policy promises their file is gone in twelve months,
   * and that is a promise about our storage, not about a CRM's.
   *
   * Read only by `generic`. An adapter talking to a real CRM API has
   * one endpoint, not two, and expresses the same choice through
   * CRM_FORWARD_APPLICATIONS instead.
   */
  CRM_APPLICATION_WEBHOOK_URL?: string;

  /**
   * Sent as `Authorization: Bearer …` on the forward. The `generic`
   * adapter includes it when set; the `hubspot` adapter REQUIRES it —
   * there it is the HubSpot service key, and without one that
   * adapter reports itself unconfigured rather than sending requests
   * that could only 401.
   */
  CRM_AUTH_TOKEN?: string;

  /**
   * Whether job applications are forwarded as well as leads. Off
   * unless set to 1/true/yes/on, and read only by adapters that
   * choose to honour it — the `generic` webhook takes both kinds, as
   * it always has.
   *
   * Off by default for HubSpot because a sales contact list is not an
   * applicant tracker. Applicants in it put every "here are your leads"
   * view out by however many people applied that month, spend the same
   * contact allowance as customers, and carry different retention
   * obligations — the résumé side of this system promises twelve
   * months, and the CRM knows nothing about that promise.
   *
   * Nothing is lost either way: applications are stored in D1 and
   * appear in /export.csv regardless of this setting.
   */
  CRM_FORWARD_APPLICATIONS?: string;

  /**
   * The Worker's own public origin, e.g. https://relay.example.com —
   * scheme and host, no trailing slash, no path.
   *
   * It is what turns a stored résumé into something the office can
   * open: resumeUrl() builds RELAY_PUBLIC_ORIGIN + /resume/<row id>,
   * and that link is what goes to the CRM. The bare R2 object key went
   * before it and was honest and useless — nobody opens a CRM record
   * and then reaches for `wrangler r2 object get`.
   *
   * It lives here, on the CRM env, because the adapters are what build
   * the link. A variable rather than something read off the incoming
   * request, because the retry sweep forwards rows with no request in
   * hand — a link that is right on the request path and empty on the
   * sweep path is a bug that only shows up in the rows nobody looked
   * at.
   *
   * Unset, rows still forward and still carry resumeKey; they just
   * arrive with no link, and the log says so on every one.
   */
  RELAY_PUBLIC_ORIGIN?: string;
}

const TRUTHY = new Set(["1", "true", "yes", "on"]);

export function forwardsApplications(env: CrmEnv): boolean {
  return TRUTHY.has((env.CRM_FORWARD_APPLICATIONS ?? "").trim().toLowerCase());
}

/* ── Row helpers the adapters share ─────────────────────────────── */

/**
 * The questionnaire as an object, whatever is actually in the column.
 *
 * cleanAnswers() in the Worker is allowed to store a plain string when
 * what arrived did not parse as an object — it keeps the text rather
 * than dropping the only thing the applicant wrote. So a bare
 * JSON.parse() in an adapter would throw on exactly those rows, and a
 * row that throws on every forward is a row that retries six times and
 * then sits failed forever with a SyntaxError where the CRM's own
 * reason should be.
 */
export function parsedAnswers(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through: it is text, not an object.
  }
  return { answers: raw };
}

/**
 * The absolute URL of this row's résumé, or "" if there is not one.
 *
 * This is what replaced sending the bare R2 object key to the CRM. The
 * key — `applications/2026/09/<uuid>-cv.pdf` — was honest and useless:
 * the person looking at the record cannot do anything with it without
 * the R2 dashboard. The link points at the Worker's own
 * GET /resume/:leadId, which streams the file from a bucket that stays
 * private, behind Cloudflare Access.
 */
export function resumeUrl(row: LeadRow, env: CrmEnv): string {
  if (!row.resume_key) return "";

  const origin = (env.RELAY_PUBLIC_ORIGIN ?? "").trim().replace(/\/+$/, "");
  if (!origin) {
    // Loud, because the row still forwards and looks fine: the office
    // just silently gets an application with no way to read the CV.
    console.warn(
      `[relay] RELAY_PUBLIC_ORIGIN is not set — ${row.id} forwarded without a résumé link`
    );
    return "";
  }
  return `${origin}/resume/${encodeURIComponent(row.id)}`;
}

/* ── The contract ───────────────────────────────────────────────── */

export type FetchLike = typeof fetch;

/**
 * What an adapter reports back. Never a thrown error — see the header.
 *
 * `spendsAttempt` is the field worth understanding. A row gives up
 * after MAX_CRM_ATTEMPTS, so an attempt is a budget, and a throttle is
 * not a refusal: a CRM answering 429 means "not now", and spending one
 * of six tries on it would eventually strand a perfectly good lead
 * because the office had a busy afternoon. Anything that is a real
 * rejection — a bad payload, a property that does not exist, a revoked
 * token — spends one, so a permanent misconfiguration stops hammering
 * and stays visible in the table as failed.
 */
export type CrmOutcome =
  | { ok: true }
  | { ok: false; error: string; spendsAttempt: boolean };

export interface CrmAdapter {
  readonly id: string;

  /** Whether this adapter has what it needs to send anything at all. */
  configured(env: CrmEnv): boolean;

  /** Whether this particular row is one this CRM should receive. */
  accepts(row: LeadRow, env: CrmEnv): boolean;

  /**
   * Why accepts() said no, which decides whether the row is ever
   * looked at again.
   *
   * 'skipped'  a decision. This CRM does not take rows like this one,
   *            and the sweep leaves it alone forever.
   * 'disabled' an absence. There is nowhere to put this row YET, and
   *            the sweep delivers it the moment somewhere exists.
   *
   * Defaulted to 'skipped' because that is the usual reason an adapter
   * declines — HubSpot turning applications away is policy, not a
   * missing setting. `generic` overrides it: it only ever declines for
   * want of a URL, and forgetting a URL must not permanently bury the
   * leads captured before it was set.
   */
  declineReason?(row: LeadRow, env: CrmEnv): "skipped" | "disabled";

  /**
   * Send one row. The fetch is injectable so the flow — dedup,
   * conflict, throttle, refusal — can be exercised without a network
   * or a CRM account, neither of which exists when this is written.
   */
  send(row: LeadRow, env: CrmEnv, doFetch?: FetchLike): Promise<CrmOutcome>;
}
