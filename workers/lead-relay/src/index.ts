/**
 * ════════════════════════════════════════════════════════════════════
 *  LEAD RELAY — one list, whatever CRM turns out to be the right one.
 *
 *  Two things happen on this site that the business needs to act on: a
 *  homeowner asks for an assessment, and somebody applies for a job.
 *  Before this, those went to two different places — Web3Forms sent the
 *  first to an inbox, the careers Worker put the second in an R2 bucket
 *  — and neither was a list anyone could work through.
 *
 *  This is that list. Everything lands here, in one table, and from
 *  here it is forwarded to whichever CRM gets chosen.
 *
 *  ── WHY IT IS CRM-AGNOSTIC, WHICH IS THE WHOLE POINT ────────────────
 *
 *  The CRM has not been picked yet. Writing directly to HubSpot or
 *  Jobber or AccuLynx would mean either waiting for that decision — and
 *  losing every lead in the meantime — or rewriting both forms when it
 *  is made. So the relay stores first and forwards second, through an
 *  adapter chosen by CRM_ADAPTER. Until one is configured every lead is
 *  still captured, and /export.csv hands the backlog to whatever gets
 *  chosen, for import on day one.
 *
 *  The adapters live in src/crm/ and that is the only place a CRM is
 *  named. `generic` posts flat JSON at CRM_WEBHOOK_URL, which is what a
 *  Zapier hook wants and is still the default; `hubspot` talks to the
 *  CRM Objects API and is the demo account. Adding a roofing CRM later
 *  is a file next to those two — this file does not change.
 *
 *  ── THE ORDER OF OPERATIONS IS THE DESIGN ───────────────────────────
 *
 *  Write the row. Answer the caller. Forward afterwards.
 *
 *  Anything else couples the business's ability to take work to a third
 *  party's uptime. If the CRM is down, a lead that was forwarded and
 *  not stored is gone; a lead that was stored and not forwarded is a
 *  row with crm_status='failed' that the retry picks up. The failure
 *  mode is a delayed delivery instead of a lost customer.
 *
 *  ── WHAT THIS IS NOT ────────────────────────────────────────────────
 *
 *  It is NOT on the critical path for either form. The contact form
 *  still posts to Web3Forms, and the email still arrives whether or not
 *  this Worker is reachable; the careers Worker still writes the résumé
 *  to R2 before it pings here. This is the second copy, deliberately,
 *  because the first copy must not depend on code we maintain.
 *
 *  ── THE TWO READ PATHS, AND WHAT GUARDS EACH ───────────────────────
 *
 *  Nothing here is readable without passing something. /export.csv
 *  wants a bearer token, because the table holds strangers' names,
 *  phone numbers and addresses. /resume/:leadId hands back the résumé
 *  file a job applicant uploaded, and is guarded by CLOUDFLARE ACCESS
 *  IN FRONT OF THE WORKER rather than by code in it.
 *
 *  That split is deliberate. The office needs to click a link in a CRM
 *  record and get a file; a browser following a link cannot attach an
 *  Authorization header, so a token on that route would only be a token
 *  in the URL, which is a credential in every CRM record, every browser
 *  history and every email that forwards the lead. Access puts a Google
 *  Workspace sign-in in front of the route and costs nothing at the client's
 *  size. The R2 bucket stays private either way — see the R2 comment in
 *  wrangler.toml, and docs/LAUNCH-CREDENTIALS.md for the Access
 *  application itself, which is configuration and not code.
 *
 *  The consequence worth stating plainly: the résumé route's
 *  authentication lives somewhere this file cannot see, so it cannot be
 *  verified from here. The lead id in the path is an unguessable v4
 *  UUID, which is worth having and is NOT access control. Deploying
 *  this Worker on a hostname Access does not cover leaves that route
 *  open to anyone holding a lead id.
 * ════════════════════════════════════════════════════════════════════
 */

import {
  adapterFor,
  crmConfigured,
  crmStatusFor,
  deliverableKinds,
  type CrmEnv,
  type LeadRow,
} from "./crm/index.ts";

/**
 * Everything the Worker is given. The CRM half of it is declared with
 * the adapters, in src/crm/types.ts, because that is where it is read
 * and where it is documented.
 */
export interface Env extends CrmEnv {
  /** The lead book. See schema.sql. */
  DB: D1Database;

  /** Comma-separated, exact scheme+host. No wildcards, no trailing slash. */
  ALLOWED_ORIGINS: string;

  /**
   * Read-only handle on the résumé bucket, for GET /resume/:leadId.
   *
   * The careers Worker owns the write side and keeps it; this binding
   * exists only so a file that used to be reachable through the R2
   * dashboard or `wrangler r2 object get` is reachable by clicking a
   * link in a CRM record. The bucket itself stays PRIVATE — no r2.dev
   * URL, no custom domain — because what makes this route safe is
   * Cloudflare Access in front of it, not the bucket being open.
   *
   * Optional in the type on purpose: a deploy that predates the binding
   * should lose one route to an honest 503 rather than break the intake
   * routes that are the reason this Worker exists.
   */
  RESUMES?: R2Bucket;

  /**
   * Shared secret for POST /application, which is called by the careers
   * Worker rather than by a browser. REQUIRED for that route: without
   * it the route refuses everything, because an open endpoint that
   * writes to the lead book is a spam faucet.
   */
  INGEST_SECRET?: string;

  /** Bearer token for GET /export.csv. Required for that route. */
  EXPORT_TOKEN?: string;

  /** Leads per IP per hour on the public route. Default 10. */
  RATE_LIMIT_PER_HOUR?: string;

  /** Optional KV for the per-IP backstop limiter. */
  RATE_LIMIT?: KVNamespace;
}

const DEFAULT_RATE_PER_HOUR = 10;

/** How many times the retry will keep trying before it gives up. */
const MAX_CRM_ATTEMPTS = 6;

/** Rows per retry sweep. Small enough to stay well inside a cron's budget. */
const RETRY_BATCH = 25;

/* ── Origins and responses ──────────────────────────────────────── */

function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function corsHeaders(origin: string | null, env: Env): HeadersInit {
  const list = allowedOrigins(env);
  const matched = origin && list.includes(origin) ? origin : "";
  return {
    // Echo exactly one origin, never "*". Vary so a cache cannot serve
    // one site's CORS answer to another's request.
    ...(matched ? { "Access-Control-Allow-Origin": matched } : {}),
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(
  body: unknown,
  status: number,
  origin: string | null,
  env: Env
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...corsHeaders(origin, env),
    },
  });
}

/** One vague message for the caller; the real reason goes to the log. */
function reject(
  logReason: string,
  status: number,
  origin: string | null,
  env: Env,
  userMessage = "We couldn't record that."
): Response {
  console.warn(`[relay] rejected (${status}): ${logReason}`);
  return json({ ok: false, error: userMessage }, status, origin, env);
}

/* ── Cleaning ───────────────────────────────────────────────────── */

/**
 * Strip control characters, collapse whitespace, cap the length.
 *
 * These strings end up in a database, a CSV and somebody else's CRM. A
 * newline inside a name is header-shaped to whatever renders it, and a
 * megabyte in a field nobody caps is a cheap way to fill the table.
 */
function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Null rather than "" for a field the form does not ask about. */
function orNull(value: string): string | null {
  return value.length ? value : null;
}

/**
 * The questionnaire, re-serialised rather than stored as it arrived.
 *
 * Parsing and rebuilding it means a caller cannot smuggle anything
 * structural through a field that is only ever read back as a flat
 * object of short strings.
 */
function cleanAnswers(raw: unknown): string | null {
  const text = typeof raw === "string" ? raw : "";
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return orNull(clean(text, 4000));
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed).slice(0, 40)) {
      const key = clean(k, 200);
      if (key) out[key] = clean(v, 2000);
    }
    return Object.keys(out).length ? JSON.stringify(out) : null;
  } catch {
    return orNull(clean(text, 4000));
  }
}

/* ── Rate limiting ──────────────────────────────────────────────── */

function ratePerHour(env: Env): number {
  const n = Number.parseInt(env.RATE_LIMIT_PER_HOUR ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RATE_PER_HOUR;
}

/**
 * A backstop, not a control. A WAF rate-limiting rule on the route is
 * better because it stops the request before it reaches the Worker and
 * bills; this is what exists without one. A no-op when KV is unbound.
 */
async function overRateLimit(ip: string, env: Env): Promise<boolean> {
  if (!env.RATE_LIMIT || !ip) return false;
  const hour = new Date().toISOString().slice(0, 13);
  const key = `rate:${hour}:${ip}`;
  try {
    const current = Number.parseInt((await env.RATE_LIMIT.get(key)) ?? "0", 10);
    if (current >= ratePerHour(env)) return true;
    await env.RATE_LIMIT.put(key, String(current + 1), {
      expirationTtl: 7200,
    });
    return false;
  } catch (e) {
    // A limiter that is down must not become a gate that is closed.
    console.warn("[relay] rate limiter unavailable:", e);
    return false;
  }
}

/* ── The row ────────────────────────────────────────────────────── */

function rowFrom(body: Record<string, unknown>, kind: LeadRow["kind"]): LeadRow {
  return {
    id: crypto.randomUUID(),
    kind,
    // Server time, always. A timestamp the caller supplies is one the
    // caller can backdate, and this column is used for ordering.
    received_at: new Date().toISOString(),
    name: orNull(clean(body.name, 120)),
    phone: orNull(clean(body.phone, 40)),
    email: orNull(clean(body.email, 160)),
    address: orNull(clean(body.address, 240)),
    service: orNull(clean(body.service, 120)),
    urgency: orNull(clean(body.urgency, 80)),
    message: orNull(clean(body.message, 4000)),
    role: orNull(clean(body.role, 120)),
    answers: cleanAnswers(body.answers),
    resume_key: orNull(clean(body.resumeKey ?? body.resume_key, 240)),
    source: orNull(clean(body.source, 400)),
  };
}

async function store(row: LeadRow, status: string, env: Env): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO leads (
       id, kind, received_at, name, phone, email, address, service,
       urgency, message, role, answers, resume_key, source, crm_status
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  )
    .bind(
      row.id,
      row.kind,
      row.received_at,
      row.name,
      row.phone,
      row.email,
      row.address,
      row.service,
      row.urgency,
      row.message,
      row.role,
      row.answers,
      row.resume_key,
      row.source,
      status
    )
    .run();
}

/**
 * The delivery state a row is born with.
 *
 * Deciding it here rather than writing 'pending' and immediately
 * correcting it keeps the row's history honest: crm_attempts stays a
 * count of real attempts, and nothing in the table implies a delivery
 * was tried when none was. What the states mean, and why 'skipped' and
 * 'disabled' are different, is with the adapters in src/crm/index.ts.
 */
function crmStatusAtRest(row: LeadRow, env: Env): string {
  return crmStatusFor(row, env);
}

type Delivery = {
  status: string;
  /** 1 for a real attempt, 0 for a throttle or a skip. See CrmOutcome. */
  spent: 0 | 1;
  error: string | null;
  sentAt: string | null;
};

/**
 * Write what happened back to the row. The one place that does.
 *
 * Swallows its own failure on purpose: the lead is already stored and
 * the email already sent, so a bookkeeping write that does not land
 * costs a status column, not a customer.
 */
async function record(row: LeadRow, env: Env, state: Delivery): Promise<void> {
  try {
    await env.DB.prepare(
      `UPDATE leads
          SET crm_status = ?, crm_attempts = crm_attempts + ?,
              crm_error = ?, crm_sent_at = ?
        WHERE id = ?`
    )
      .bind(state.status, state.spent, state.error, state.sentAt, row.id)
      .run();
  } catch (e) {
    console.error(`[relay] could not record CRM result for ${row.id}:`, e);
  }
}

/* ── Forwarding ─────────────────────────────────────────────────── */

/**
 * Send one row onward and record what happened.
 *
 * Never throws — the adapters are held to the same rule, so every
 * outcome is a state written back to the row, which is what lets the
 * retry sweep below be a simple query rather than a queue with its own
 * failure modes.
 */
async function forward(row: LeadRow, env: Env): Promise<void> {
  const adapter = adapterFor(env);
  if (!adapter || !adapter.configured(env)) return;

  /*
   * A row this CRM does not take: an application with
   * CRM_FORWARD_APPLICATIONS off, or a row stored under one adapter and
   * swept under another. Recorded rather than left pending, so the
   * sweep stops picking it up every fifteen minutes forever and so
   * /export.csv says plainly that nobody tried — not that something
   * failed.
   */
  if (!adapter.accepts(row, env)) {
    await record(row, env, {
      status: "skipped",
      spent: 0,
      error: null,
      sentAt: null,
    });
    return;
  }

  const outcome = await adapter.send(row, env);

  await record(
    row,
    env,
    outcome.ok
      ? {
          status: "sent",
          spent: 1,
          error: null,
          sentAt: new Date().toISOString(),
        }
      : {
          status: "failed",
          spent: outcome.spendsAttempt ? 1 : 0,
          error: outcome.error.slice(0, 1000),
          sentAt: null,
        }
  );

  if (!outcome.ok) {
    console.error(`[relay] ${adapter.id} refused ${row.id}: ${outcome.error}`);
  }
}

/**
 * The retry sweep, run on a schedule.
 *
 * Oldest first, so a backlog drains in the order it arrived rather than
 * newest-first — somebody who asked for a roof assessment on Tuesday
 * should not sit behind Friday's just because the CRM came back on
 * Friday. Rows past MAX_CRM_ATTEMPTS are left alone and stay visible in
 * the table as failed; something that has refused six times is a
 * configuration problem, and hammering it forever hides that.
 */
async function retryFailed(env: Env): Promise<number> {
  if (!crmConfigured(env)) return 0;

  // Only ask for kinds the configured adapter can actually deliver.
  // The adapter decides, because CRM_WEBHOOK_URL is the generic
  // adapter's destination and nobody else's — gating this on it meant
  // HubSpot, which never sets it, swept nothing at all.
  const kinds = deliverableKinds(env);
  if (!kinds.length) return 0;

  /*
   * 'disabled' is in the list so that configuring a CRM for the first
   * time delivers everything captured before it existed. 'skipped' is
   * deliberately NOT: those rows are a decision, not a backlog, and
   * leaving them in would eventually fill every batch of 25 with the
   * same applications and starve the leads behind them. Turning
   * CRM_FORWARD_APPLICATIONS on therefore does not backfill by itself —
   * that is one statement, documented in docs/HUBSPOT-SETUP.md:
   *   UPDATE leads SET crm_status='pending' WHERE crm_status='skipped';
   */
  const { results } = await env.DB.prepare(
    `SELECT * FROM leads
      WHERE kind IN (${kinds.map(() => "?").join(",")})
        AND crm_status IN ('failed', 'pending', 'disabled')
        AND crm_attempts < ?
      ORDER BY received_at ASC
      LIMIT ?`
  )
    .bind(...kinds, MAX_CRM_ATTEMPTS, RETRY_BATCH)
    .all<LeadRow>();

  for (const row of results ?? []) await forward(row, env);
  return (results ?? []).length;
}

/* ── Export ─────────────────────────────────────────────────────── */

const CSV_COLUMNS = [
  "id",
  "kind",
  "received_at",
  "name",
  "phone",
  "email",
  "address",
  "service",
  "urgency",
  "message",
  "role",
  "answers",
  "resume_key",
  "source",
  "crm_status",
] as const;

/**
 * One CSV cell.
 *
 * The leading apostrophe on a value starting with =, +, - or @ is not
 * cosmetic: Excel and Sheets treat those as formulas, so a "name" of
 * `=cmd|'/c calc'!A1` becomes code the moment somebody opens the export
 * on an office machine. This table is filled in by strangers through a
 * public form, which is exactly the threat model that attack was
 * written for.
 */
function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/* ── The résumé download ────────────────────────────────────────── */

/**
 * Plain text, because the caller here is a person.
 *
 * Every other response this Worker makes is JSON for a form's
 * JavaScript. This route is a link somebody clicked inside a CRM
 * record, so what it says on a bad day is read by a human in a browser
 * tab — and a bare 410 with an empty body sends that human to ask us
 * what happened, where a sentence does not.
 *
 * No CORS headers, either. This is a top-level navigation, not a
 * cross-origin fetch, and there is no page anywhere that should be
 * reading a résumé out of this route with script.
 */
function resumeText(body: string, status: number): Response {
  return new Response(`${body}\n`, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * A lead id is a crypto.randomUUID() minted in rowFrom().
 *
 * This guard is not what makes the lookup safe — the query is
 * parameterised, and that is what makes it safe. It is what stops a
 * path full of junk becoming a D1 round trip, and it is deliberately
 * looser than a UUID pattern so the route does not quietly start
 * 404ing if ids ever change shape.
 */
function looksLikeLeadId(id: string): boolean {
  return id.length > 0 && id.length <= 64 && /^[A-Za-z0-9._-]+$/.test(id);
}

/**
 * `Jane-Doe-resume.pdf`, not `9f2c…-cv.pdf`.
 *
 * The extension comes off the stored key rather than off anything the
 * applicant typed: the careers Worker built that key from an extension
 * it had already checked against the file's magic bytes, so it is the
 * one trustworthy statement about what this file is. The name comes
 * from the D1 row rather than the object's metadata because the row is
 * already in hand and the metadata is percent-encoded.
 *
 * Both header forms are sent. Content-Disposition is an HTTP header and
 * therefore ASCII, which would turn `José` into mojibake at best; the
 * RFC 5987 `filename*` carries the real UTF-8 name for anything
 * current, and the stripped ASCII `filename` is the fallback. A name
 * that strips away to nothing becomes plain `resume`, because a
 * download called `-resume.pdf` looks like a bug.
 */
function resumeDisposition(row: {
  name: string | null;
  resume_key: string | null;
}): string {
  const ext =
    /\.([A-Za-z0-9]{1,8})$/.exec(row.resume_key ?? "")?.[1]?.toLowerCase() ?? "";
  const suffix = ext ? `.${ext}` : "";

  const stem = (row.name ?? "").trim().replace(/\s+/g, "-") || "resume";
  const pretty = `${stem}-resume${suffix}`;
  const ascii =
    pretty.replace(/[^\x20-\x7e]/g, "").replace(/["\;]/g, "").trim() ||
    `resume${suffix}`;

  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(
    pretty
  )}`;
}

/**
 * GET /resume/:leadId — the résumé behind a lead, as a download.
 *
 * This is the route the CRM's resumeUrl points at, and the reason this
 * Worker has an R2 binding at all. What guards it is CLOUDFLARE ACCESS
 * IN FRONT OF THE WORKER, not code in it — see the header of this file
 * for why a bearer token cannot do this job, and
 * docs/LAUNCH-CREDENTIALS.md for the application to create.
 *
 * Considered and rejected: checking for the `Cf-Access-Jwt-Assertion`
 * header as a belt-and-braces gate. A header check is not a signature
 * check, so it would refuse an honest misconfiguration while waving
 * through anybody who can reach the Worker on a hostname Access does
 * not cover and set a header — which is precisely the case it would be
 * there to catch. Pseudo-security that reads as security is worse than
 * none, so the requirement is stated in the comments and the docs, and
 * `workers_dev = false` plus a route on the zone is what actually
 * enforces it. Verifying the JWT properly is the real upgrade, and it
 * needs the team domain and audience tag as configuration.
 */
async function serveResume(
  rawId: string,
  req: Request,
  env: Env
): Promise<Response> {
  if (req.method !== "GET") {
    return resumeText("Use GET to download a résumé.", 405);
  }

  let id: string;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    // A malformed percent-escape is not a lead id.
    return resumeText("No application matches that link.", 404);
  }
  if (!looksLikeLeadId(id)) {
    return resumeText("No application matches that link.", 404);
  }

  const row = await env.DB.prepare(
    `SELECT id, name, resume_key FROM leads WHERE id = ?`
  )
    .bind(id)
    .first<{ id: string; name: string | null; resume_key: string | null }>();

  // One answer for "no such lead" and "that lead has no résumé". Both
  // are "there is nothing here", and telling them apart would turn this
  // route into a way to ask whether a given id exists.
  if (!row || !row.resume_key) {
    return resumeText("No résumé is attached to that application.", 404);
  }

  if (!env.RESUMES) {
    console.error(
      `[relay] RESUMES is not bound — cannot serve ${row.resume_key}`
    );
    return resumeText(
      "Résumé downloads are not configured on this deployment. The file itself is unaffected: it is in the client-resumes bucket and can be fetched with `wrangler r2 object get`.",
      503
    );
  }

  const object = await env.RESUMES.get(row.resume_key);

  // The 410 is the entire reason this is not another 404.
  //
  // A row that has a key and no object is the retention rule having
  // done its job: applications are deleted after twelve months by an R2
  // lifecycle rule, deliberately, and the privacy policy promises
  // exactly that. "Gone, and here is why" is the truthful answer. A 404
  // would read as a broken link and send somebody hunting for a file
  // that was destroyed on purpose — or, worse, asking whether the
  // pipeline is broken.
  if (!object) {
    console.log(
      `[relay] résumé gone for ${row.id} (${row.resume_key}) — past retention or deleted`
    );
    return resumeText(
      "This résumé is no longer available. Job applications are kept for twelve months and then deleted automatically, and this one's retention period has elapsed. The applicant's own details are still on the lead record.",
      410
    );
  }

  // Streamed straight through rather than buffered: a 5 MB cap means
  // either would work, but there is no reason for the file to exist in
  // the Worker's memory on the way past.
  return new Response(object.body, {
    status: 200,
    headers: {
      // R2 kept the content type the careers Worker verified on upload.
      "Content-Type":
        object.httpMetadata?.contentType ?? "application/octet-stream",
      "Content-Disposition": resumeDisposition(row),
      "Content-Length": String(object.size),
      // Never cached, anywhere. This is somebody's CV behind a sign-in,
      // and a cached copy outlives the sign-in that authorised it.
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/* ── Handler ────────────────────────────────────────────────────── */

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = req.headers.get("Origin");
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    if (path === "/health") {
      // Deliberately says nothing about configuration. A health check
      // that reports which secrets are set is a reconnaissance endpoint.
      return json({ ok: true }, 200, origin, env);
    }

    /* ── The export ─────────────────────────────────────────────── */
    if (path === "/export.csv") {
      if (req.method !== "GET") {
        return reject("wrong method for export", 405, origin, env);
      }
      const token = (req.headers.get("Authorization") ?? "").replace(
        /^Bearer\s+/i,
        ""
      );
      // No token configured means the route is closed, not open. The
      // table holds strangers' addresses and phone numbers.
      if (!env.EXPORT_TOKEN || !token || token !== env.EXPORT_TOKEN) {
        return reject("bad or missing export token", 401, origin, env, "Not authorised.");
      }

      const { results } = await env.DB.prepare(
        `SELECT ${CSV_COLUMNS.join(", ")} FROM leads ORDER BY received_at DESC`
      ).all<Record<string, unknown>>();

      const rows = results ?? [];
      const csv = [
        CSV_COLUMNS.join(","),
        ...rows.map((r) => CSV_COLUMNS.map((c) => csvCell(r[c])).join(",")),
      ].join("\r\n");

      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="client-leads-${new Date()
            .toISOString()
            .slice(0, 10)}.csv"`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    /* ── The résumé download ────────────────────────────────────── */
    // Matched before intake so a bad id gets the readable text answer
    // rather than the JSON "Not found." meant for a form's JavaScript.
    if (path === "/resume" || path.startsWith("/resume/")) {
      return serveResume(path.slice("/resume/".length), req, env);
    }

    /* ── Intake ─────────────────────────────────────────────────── */
    const isLead = path === "/lead";
    const isApplication = path === "/application";
    if (!isLead && !isApplication) {
      return reject(`no route for ${path}`, 404, origin, env, "Not found.");
    }
    if (req.method !== "POST") {
      return reject("wrong method", 405, origin, env);
    }

    // /lead is called by a browser, so it is origin-gated — which stops
    // another WEBSITE posting on a visitor's behalf and nothing else; a
    // script sets Origin to whatever it likes.
    //
    // /application is called by the careers Worker, server to server,
    // so it has no Origin to check and uses a shared secret instead.
    if (isApplication) {
      const secret = req.headers.get("X-Ingest-Secret") ?? "";
      if (!env.INGEST_SECRET || secret !== env.INGEST_SECRET) {
        return reject("bad or missing ingest secret", 401, origin, env, "Not authorised.");
      }
    } else {
      const list = allowedOrigins(env);
      if (list.length && origin && !list.includes(origin)) {
        return reject(`origin not allowed: ${origin}`, 403, origin, env);
      }
    }

    const ip = req.headers.get("CF-Connecting-IP") ?? "";
    if (isLead && (await overRateLimit(ip, env))) {
      return reject(`rate limit hit for ${ip}`, 429, origin, env, "Too many submissions. Please call us.");
    }

    let body: Record<string, unknown>;
    try {
      const parsed = await req.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("not an object");
      }
      body = parsed as Record<string, unknown>;
    } catch (e) {
      return reject(`unparseable body: ${e}`, 400, origin, env);
    }

    const row = rowFrom(body, isApplication ? "application" : "lead");

    /*
     * ── THE ONLY CONTENT RULE ────────────────────────────────────────
     *
     * It differs by kind, because the two forms ask differently and
     * refusing a record is refusing a person who tried to get in touch.
     *
     * An assessment request must carry an email address. The contact
     * form requires one, so a /lead without it is either a caller
     * skipping the form's own validation or a bug on our side — and a
     * row the office cannot email is a row that costs a second phone
     * call to repair, if anyone notices at all. Refusing it here says
     * so while the visitor is still on the page.
     *
     * An application is not held to that. The careers form asks for an
     * email optionally on purpose — the roofer filling it in one-handed
     * in a truck has a phone number and may not check an inbox — so the
     * older floor still applies there: some way to reach the person.
     *
     * Both rules are about reachability, not format. Whether an address
     * is deliverable is not knowable from here, and the browser has
     * already made the obvious check.
     */
    if (isLead && !row.email) {
      return reject("lead with no email", 400, origin, env, "Please include an email address.");
    }
    if (!row.phone && !row.email) {
      return reject("no phone and no email", 400, origin, env, "Please include a phone number or an email.");
    }

    // Per row, not per Worker: with only CRM_APPLICATION_WEBHOOK_URL
    // set, an application is 'pending' and a lead is genuinely
    // 'disabled', and the sweep reads exactly that distinction back.
    const status = crmStatusAtRest(row, env);
    try {
      await store(row, status, env);
    } catch (e) {
      // The one failure the caller is told about, because it is the one
      // that means the lead is genuinely not written down anywhere here.
      console.error("[relay] could not store lead:", e);
      return reject(`store failed: ${e}`, 500, origin, env);
    }

    // Answer now; forward on the way out. The caller's form is not made
    // to wait on somebody else's CRM, and the row is already safe.
    if (status === "pending") ctx.waitUntil(forward(row, env));

    return json({ ok: true, id: row.id }, 200, origin, env);
  },

  /**
   * The retry sweep. Scheduled in wrangler.toml.
   *
   * This is what turns "the CRM was down" from a lost lead into a late
   * one, and it is the reason the forward is allowed to fail quietly.
   */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      retryFailed(env)
        .then((n) => {
          if (n) console.log(`[relay] retried ${n} lead(s)`);
        })
        .catch((e) => console.error("[relay] retry sweep failed:", e))
    );
  },
} satisfies ExportedHandler<Env>;
