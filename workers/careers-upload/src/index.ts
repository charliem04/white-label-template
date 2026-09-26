/**
 * ════════════════════════════════════════════════════════════════════
 *  CAREERS UPLOAD — the only server-side code in this project.
 *
 *  The site is a static export, which cannot accept a file. This Worker
 *  exists solely so somebody can attach a résumé: it takes one
 *  multipart POST, validates it hard, writes the file to a PRIVATE R2
 *  bucket, and pings the office. Nothing else. It has no read path, no
 *  listing, and no way to hand a file back out.
 *
 *  That is deliberate. A public read path on a bucket full of
 *  strangers' phone numbers and addresses is the failure mode worth
 *  designing out, not the file-size limit.
 *
 *  Reading a résumé back is somebody else's job, and stays that way.
 *  The lead relay holds a read-only binding on the same bucket and
 *  serves one download route, GET /resume/:leadId, behind Cloudflare
 *  Access — so the office clicks a link on the CRM record rather than
 *  opening the R2 dashboard. This Worker is not that route and must not
 *  grow into it: the thing that takes anonymous uploads from the
 *  internet is the last thing that should also be able to serve them.
 *
 *  ── THE LAYERS, and what each is actually worth ─────────────────────
 *
 *  1. Origin allowlist. Be honest about this one: it stops another
 *     WEBSITE's browser posting on a visitor's behalf, and nothing
 *     else. A script sets the Origin header to whatever it likes, so
 *     this is not a defence against a determined caller. It is here for
 *     the browser case only.
 *  2. TURNSTILE. This is the actual gate — the only layer that
 *     distinguishes a person from a script. It is REQUIRED: with no
 *     secret configured the Worker refuses every upload rather than
 *     quietly running wide open. See ALLOW_INSECURE_NO_CAPTCHA.
 *  3. Content-Length gate before the body is read. An optimisation, not
 *     a control — a chunked request has no Content-Length, so the real
 *     size limit is the post-parse check further down.
 *  4. Extension + MAGIC BYTES. Extension and Content-Type are both
 *     supplied by the uploader; only the bytes are evidence.
 *  5. Optional KV rate limit per IP, as a backstop. A WAF rate-limiting
 *     rule on the route is better because it stops the request before
 *     it reaches the Worker and bills.
 *  6. Every text field is scrubbed of control characters before it
 *     touches metadata or the notification, and metadata values are
 *     encoded to printable ASCII, because R2 custom metadata travels in
 *     HTTP headers.
 *  7. The stored key is generated here. A filename from a form field
 *     is never a path.
 *
 *  NOT covered, and worth knowing: nothing scans these files. A valid
 *  PDF or DOCX can still carry an exploit or a macro, and whoever opens
 *  one in the office is the last line of defence. .doc is refused
 *  outright because the legacy OLE format is the worst offender.
 *
 *  Errors returned to the browser are deliberately vague. Details go to
 *  the Workers log, where the operator can see them and an attacker
 *  cannot.
 * ════════════════════════════════════════════════════════════════════
 */

export interface Env {
  /** Private R2 bucket. Do NOT attach a public bucket URL to it. */
  RESUMES: R2Bucket;
  /** Comma-separated, exact scheme+host. No wildcards, no trailing slash. */
  ALLOWED_ORIGINS: string;
  /** Bytes. Default 5 MB if unset or unparseable. */
  MAX_UPLOAD_BYTES?: string;
  /**
   * Cloudflare Turnstile secret. REQUIRED — with this unset the Worker
   * refuses every upload, unless ALLOW_INSECURE_NO_CAPTCHA is set.
   */
  TURNSTILE_SECRET?: string;
  /**
   * Deliberately ugly name. Set to "true" ONLY in local dev, where
   * there is no Turnstile widget to solve. Setting it in production
   * leaves the endpoint open to any script that can send a valid PDF.
   */
  ALLOW_INSECURE_NO_CAPTCHA?: string;
  /**
   * Where the "new application" ping goes. Unset = no ping.
   *
   * In this deployment it is the lead relay's /application route (see
   * workers/lead-relay), which is what puts job applications and
   * assessment requests in one list. It stays a plain URL rather than a
   * binding so it can point anywhere — a relay, a Zapier hook, an email
   * service — without a code change.
   */
  NOTIFY_WEBHOOK?: string;
  /**
   * Shared secret for the relay's /application route, which refuses
   * anything without it. Sent as X-Ingest-Secret when set, and omitted
   * entirely when not, so NOTIFY_WEBHOOK still works against a target
   * that has never heard of it.
   *
   * Must match INGEST_SECRET on the relay. Set with
   * `wrangler secret put RELAY_INGEST_SECRET` on BOTH Workers.
   */
  RELAY_INGEST_SECRET?: string;
  /**
   * Optional KV namespace. Used for two things: the per-IP backstop
   * limiter, and short-lived storage of the raw submitting IP (see
   * IP_RETENTION_DAYS).
   */
  RATE_LIMIT?: KVNamespace;
  /** Applications per IP per hour when RATE_LIMIT is bound. Default 5. */
  RATE_LIMIT_PER_HOUR?: string;
  /**
   * Secret salt for hashing the submitting IP. With this unset, NOTHING
   * IP-derived is stored on the object — an unsalted hash of an IPv4
   * address is trivially reversed (the whole space is 4 billion), so
   * storing one would be pseudo-privacy rather than privacy.
   */
  IP_HASH_SALT?: string;
  /**
   * How long the raw IP survives in KV. Default 30 days — long enough
   * to investigate a burst of abuse, far shorter than the résumé itself
   * is kept. Requires RATE_LIMIT to be bound; without it the raw IP is
   * simply never written down here at all.
   */
  IP_RETENTION_DAYS?: string;
}

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_RATE_PER_HOUR = 5;
const DEFAULT_IP_RETENTION_DAYS = 30;

/**
 * How long an application is kept, in days.
 *
 * This Worker does not enforce it — an R2 lifecycle rule does, so the
 * deletion happens whether or not anybody remembers. The constant is
 * here so the three places that must agree can be checked against each
 * other:
 *
 *   1. this value
 *   2. the lifecycle rule, applied by `npm run retention`
 *   3. the "How long we keep it" section of the privacy policy
 *
 * Change one and change all three, or the site is making a promise the
 * bucket does not keep.
 *
 * NOT exported: the Workers runtime treats every named export of the
 * entry module as a handler or binding and refuses to start with
 * "Incorrect type for map entry 'RETENTION_DAYS'". Keep it local.
 */
const RETENTION_DAYS = 365;

/** What a résumé is allowed to be, and how to recognise one for real. */
const ALLOWED = [
  { ext: "pdf", mime: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  {
    ext: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    magic: [0x50, 0x4b, 0x03, 0x04], // PK.. — docx is a zip
  },
] as const;

/**
 * Refused on purpose, with a message that tells the applicant what to
 * do instead. .doc is the legacy OLE format — the classic macro
 * carrier — and nothing here scans it, so the person who would eat the
 * risk is whoever in the office double-clicks it.
 */
const REFUSED_EXTENSIONS = new Set(["doc", "docm", "dotm", "rtf", "pages"]);

/* ── Small helpers ─────────────────────────────────────────────────── */

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

/** One vague message for the browser; the real reason goes to the log. */
function reject(
  logReason: string,
  status: number,
  origin: string | null,
  env: Env,
  userMessage = "We couldn't accept that application."
): Response {
  console.warn(`[careers] rejected (${status}): ${logReason}`);
  return json({ ok: false, error: userMessage }, status, origin, env);
}

function maxBytes(env: Env): number {
  const n = Number.parseInt(env.MAX_UPLOAD_BYTES ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
}

/**
 * Collapse a submitted filename to something safe to put in a key.
 *
 * Everything outside [A-Za-z0-9._-] becomes a dash, which folds away
 * path separators, control bytes and unicode tricks in one pass.
 * Leading dots and dashes are then stripped so a name can never become
 * ".." or a hidden file, and an empty result falls back rather than
 * producing a key that ends in a bare slash.
 */
function safeName(name: string): string {
  return (
    name
      .replace(/[^A-Za-z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[.-]+/, "")
      .slice(0, 80) || "resume"
  );
}

/**
 * Scrub a submitted text field.
 *
 * Strips C0 and C1 control characters — CR and LF among them — because
 * these strings do not stay in this Worker. They go into R2 custom
 * metadata, which travels as HTTP headers, and into the notification
 * webhook, which usually ends up as an email. A newline in either place
 * is header injection; a run of control bytes is a corrupted record.
 *
 * Whitespace is then collapsed and the value capped. Nothing is escaped
 * for HTML here on purpose: escaping belongs at the point of rendering,
 * and doing it early would store `&amp;` in somebody's surname.
 */
function cleanText(value: unknown, max: number): string {
  return String(value ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/**
 * Make a value safe to put in R2 custom metadata.
 *
 * Custom metadata rides in HTTP headers, which are ASCII. A name like
 * "José" is not hypothetical in the service area, and an unencodable header
 * value means the put throws and a real applicant gets a 502.
 *
 * So: percent-encode `%` itself and anything outside printable ASCII,
 * and leave everything else alone. Plain names pass through unchanged
 * and stay readable in the dashboard; accents and emoji survive
 * losslessly as %XX. Decode with decodeURIComponent when reading.
 */
function asciiMeta(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === "%") {
      out += "%25";
    } else if (code >= 0x20 && code <= 0x7e) {
      out += ch;
    } else {
      for (const byte of new TextEncoder().encode(ch)) {
        out += "%" + byte.toString(16).toUpperCase().padStart(2, "0");
      }
    }
  }
  return out;
}

/**
 * Clean the questionnaire answers without losing their structure.
 *
 * The form sends one JSON blob so a new question needs no change here.
 * Parse it, scrub both sides of every pair, and re-serialise. If it is
 * not the shape we expect, fall back to scrubbing it as plain text
 * rather than passing an unknown string through untouched.
 */
function cleanAnswers(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        out[cleanText(k, 200)] = cleanText(v, 2000);
      }
      return JSON.stringify(out);
    }
  } catch {
    // falls through
  }
  return cleanText(raw, 8000);
}

/**
 * What a file part actually is at runtime.
 *
 * @cloudflare/workers-types declares FormData.get() as `string | null`,
 * but a multipart file part really does come back as a File. The types
 * are lossy rather than the runtime being different, so the entry is
 * duck-typed here instead of blind-cast — if the shape is ever not what
 * we expect, this returns false and the request is rejected cleanly
 * rather than throwing on `.arrayBuffer()` halfway through.
 */
type UploadedFile = {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

function isUploadedFile(v: unknown): v is UploadedFile {
  if (typeof v !== "object" || v === null) return false;
  const f = v as Partial<UploadedFile>;
  return (
    typeof f.size === "number" &&
    typeof f.name === "string" &&
    typeof f.arrayBuffer === "function"
  );
}

function extensionOf(name: string): string {
  return /\.([A-Za-z0-9]+)$/.exec(name)?.[1]?.toLowerCase() ?? "";
}

async function verifyTurnstile(
  token: string,
  ip: string,
  secret: string
): Promise<boolean> {
  try {
    const body = new FormData();
    body.append("secret", secret);
    body.append("response", token);
    if (ip) body.append("remoteip", ip);
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body }
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (e) {
    console.error("[careers] turnstile verify threw:", e);
    return false;
  }
}

/**
 * Backstop limiter. Only active when a KV namespace is bound — it is
 * not a substitute for Turnstile or for a WAF rate-limiting rule, both
 * of which stop traffic before it reaches this Worker and costs money.
 */
async function overRateLimit(ip: string, env: Env): Promise<boolean> {
  if (!env.RATE_LIMIT || !ip) return false;
  const cap =
    Number.parseInt(env.RATE_LIMIT_PER_HOUR ?? "", 10) || DEFAULT_RATE_PER_HOUR;
  const key = `ip:${ip}:${new Date().toISOString().slice(0, 13)}`; // per hour
  const seen = Number.parseInt((await env.RATE_LIMIT.get(key)) ?? "0", 10);
  if (seen >= cap) return true;
  // 2h TTL so the hour bucket outlives its own window without a sweep.
  await env.RATE_LIMIT.put(key, String(seen + 1), { expirationTtl: 7200 });
  return false;
}

/**
 * A salted, truncated hash of the submitting IP.
 *
 * The raw address is not written to the object. What abuse
 * investigation actually needs from the bucket is "did these twenty
 * uploads come from one place", and a hash answers that. Blocking an
 * address is done from Cloudflare's own logs and WAF, which is where
 * the real IP belongs and where it ages out on Cloudflare's schedule.
 *
 * Returns "" when no salt is configured, and stores nothing rather than
 * storing an unsalted hash — IPv4 is a four-billion-entry space, so an
 * unsalted digest is a lookup table away from being the address itself.
 */
async function hashIp(ip: string, env: Env): Promise<string> {
  if (!ip || !env.IP_HASH_SALT) return "";
  const bytes = new TextEncoder().encode(`${env.IP_HASH_SALT}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Park the raw IP against the object key, on a short clock.
 *
 * This is the "drop the IP sooner than the file" half: the résumé lives
 * for RETENTION_DAYS, the address that sent it lives for
 * IP_RETENTION_DAYS. KV's expirationTtl does the deleting, so it happens
 * whether or not anybody remembers. No KV bound means the raw IP is
 * never recorded here at all, which is the safe direction to fail.
 */
async function rememberIp(key: string, ip: string, env: Env): Promise<void> {
  if (!env.RATE_LIMIT || !ip) return;
  const days =
    Number.parseInt(env.IP_RETENTION_DAYS ?? "", 10) ||
    DEFAULT_IP_RETENTION_DAYS;
  try {
    await env.RATE_LIMIT.put(`srcip:${key}`, ip, {
      expirationTtl: Math.max(60, days * 86400),
    });
  } catch (e) {
    // Never cost somebody their application over an audit breadcrumb.
    console.error("[careers] could not record source IP:", e);
  }
}

/* ── The handler ───────────────────────────────────────────────────── */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const allowed = allowedOrigins(env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }
    if (request.method !== "POST") {
      return reject("method not POST", 405, origin, env);
    }
    if (allowed.length === 0) {
      // Refuse rather than defaulting open. An unconfigured Worker that
      // accepts uploads from anywhere is worse than one that is down.
      return reject("ALLOWED_ORIGINS is not configured", 500, origin, env);
    }
    if (!origin || !allowed.includes(origin)) {
      return reject(`origin not allowed: ${origin ?? "(none)"}`, 403, origin, env);
    }

    // One route. Both "/" and "/apply" reach it, because the site's
    // NEXT_PUBLIC_CAREERS_ENDPOINT has been written both ways and a
    // trailing path should not be the difference between a job
    // application arriving and a 404.
    const limit = maxBytes(env);
    const declaredLength = Number.parseInt(
      request.headers.get("Content-Length") ?? "",
      10
    );
    if (Number.isFinite(declaredLength) && declaredLength > limit) {
      return reject(
        `content-length ${declaredLength} over ${limit}`,
        413,
        origin,
        env,
        "That file is too large. Please send a résumé under 5MB."
      );
    }

    const ip = request.headers.get("CF-Connecting-IP") ?? "";
    if (await overRateLimit(ip, env)) {
      return reject(
        `rate limited: ${ip}`,
        429,
        origin,
        env,
        "Too many applications from this connection. Please try again later."
      );
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch (e) {
      return reject(`unparseable multipart: ${e}`, 400, origin, env);
    }

    // Honeypot. Answer 200 so a bot learns nothing, store nothing.
    if (String(form.get("company") ?? "")) {
      console.warn("[careers] honeypot tripped");
      return json({ ok: true }, 200, origin, env);
    }

    // Turnstile is the only layer that tells a person from a script, so
    // a missing secret is a refusal rather than a silent bypass. The
    // escape hatch exists for local dev and announces itself every time.
    if (env.TURNSTILE_SECRET) {
      const token = String(form.get("cf-turnstile-response") ?? "");
      if (!token || !(await verifyTurnstile(token, ip, env.TURNSTILE_SECRET))) {
        return reject(
          "turnstile failed",
          403,
          origin,
          env,
          "We couldn't verify that you're human. Please reload and try again."
        );
      }
    } else if (env.ALLOW_INSECURE_NO_CAPTCHA === "true") {
      console.error(
        "[careers] RUNNING WITHOUT CAPTCHA — ALLOW_INSECURE_NO_CAPTCHA is set. " +
          "If this is production, the endpoint is open to any script."
      );
    } else {
      return reject(
        "TURNSTILE_SECRET is not configured and no explicit opt-out is set",
        500,
        origin,
        env,
        "Applications are temporarily unavailable. Please email your résumé to the office."
      );
    }

    const name = cleanText(form.get("name"), 120);
    const phone = cleanText(form.get("phone"), 40);
    const email = cleanText(form.get("email"), 160);
    const role = cleanText(form.get("role"), 120);
    const answers = cleanAnswers(String(form.get("answers") ?? ""));

    if (!name || !phone) {
      return reject(
        "missing name or phone",
        400,
        origin,
        env,
        "Please give us a name and a phone number."
      );
    }

    const file: unknown = form.get("resume");
    if (!isUploadedFile(file) || file.size === 0) {
      return reject(
        "no resume file",
        400,
        origin,
        env,
        "Please attach your résumé."
      );
    }
    if (file.size > limit) {
      return reject(
        `file ${file.size} over ${limit}`,
        413,
        origin,
        env,
        "That file is too large. Please send a résumé under 5MB."
      );
    }

    const ext = extensionOf(file.name);
    if (REFUSED_EXTENSIONS.has(ext)) {
      return reject(
        `refused legacy/macro format: .${ext}`,
        415,
        origin,
        env,
        `We can't accept .${ext} files. Please save it as a PDF and try again — in Word that is File, Save As, PDF.`
      );
    }
    const spec = ALLOWED.find((a) => a.ext === ext);
    if (!spec) {
      return reject(
        `extension not allowed: ${ext}`,
        415,
        origin,
        env,
        "Please send a PDF or a .docx Word document."
      );
    }

    // The bytes decide. Extension and Content-Type are both supplied by
    // whoever is uploading, so neither is evidence of anything.
    const bytes = new Uint8Array(await file.arrayBuffer());
    const magicOk = spec.magic.every((b, i) => bytes[i] === b);
    if (!magicOk) {
      return reject(
        `magic bytes do not match .${ext}: ${[...bytes.slice(0, 4)]
          .map((b) => b.toString(16))
          .join(" ")}`,
        415,
        origin,
        env,
        "That file doesn't look like a PDF or a .docx Word document."
      );
    }

    const ipDigest = await hashIp(ip, env);
    if (ip && !ipDigest) {
      console.warn(
        "[careers] IP_HASH_SALT is not set — storing no IP-derived value on the object."
      );
    }

    const now = new Date();
    const key = [
      "applications",
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, "0"),
      `${crypto.randomUUID()}-${safeName(file.name)}`,
    ].join("/");

    try {
      await env.RESUMES.put(key, bytes, {
        httpMetadata: { contentType: spec.mime },
        // Applicant details ride with the file so the bucket is
        // self-describing — an object is never an orphan blob whose
        // owner is only recoverable from an email somewhere.
        // Percent-encoded: these become HTTP headers, which are ASCII.
        // Plain values pass through unchanged; decode with
        // decodeURIComponent when reading the bucket.
        customMetadata: {
          name: asciiMeta(name),
          phone: asciiMeta(phone),
          email: asciiMeta(email),
          role: asciiMeta(role),
          originalFilename: safeName(file.name),
          submittedAt: now.toISOString(),
          // A salted digest, never the address. See hashIp().
          ...(ipDigest ? { ipHash: ipDigest } : {}),
          retainUntil: new Date(
            now.getTime() + RETENTION_DAYS * 86400_000
          )
            .toISOString()
            .slice(0, 10),
        },
      });
    } catch (e) {
      console.error("[careers] R2 put failed:", e);
      return json(
        {
          ok: false,
          error:
            "We couldn't store that just now. Please try again, or email your résumé to the office.",
        },
        502,
        origin,
        env
      );
    }

    // The raw address goes to KV on a 30-day clock, not onto the object
    // that is kept for a year. Failure here is logged and ignored.
    await rememberIp(key, ip, env);

    // Tell the office. Never blocks the applicant: if the ping fails
    // the file is already safely in R2, and losing the notification is
    // recoverable in a way that losing the application is not.
    if (env.NOTIFY_WEBHOOK) {
      const payload = {
        subject: `Job application — ${name}${role ? ` (${role})` : ""}`,
        name,
        phone,
        email,
        role,
        answers,
        resumeKey: key,
        submittedAt: now.toISOString(),
      };
      try {
        const res = await fetch(env.NOTIFY_WEBHOOK, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Only when configured: an unset secret must not become a
            // literal "undefined" header that the relay then rejects.
            ...(env.RELAY_INGEST_SECRET
              ? { "X-Ingest-Secret": env.RELAY_INGEST_SECRET }
              : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          console.error(`[careers] notify webhook ${res.status} for ${key}`);
        }
      } catch (e) {
        console.error(`[careers] notify webhook threw for ${key}:`, e);
      }
    } else {
      console.warn(`[careers] no NOTIFY_WEBHOOK set — ${key} stored silently`);
    }

    return json({ ok: true }, 200, origin, env);
  },
} satisfies ExportedHandler<Env>;
