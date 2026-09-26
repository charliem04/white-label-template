# client-careers-upload

The only server-side code in the the client project. It exists for one reason:
a static export cannot receive a file, and `/careers/` needs to take a
résumé.

One route, `POST /`. It takes a job application with a résumé,
validates it hard, writes the file to a **private** R2 bucket and pings
the office.

Nothing else lives here. The contact form does not come through this
Worker — it posts to Web3Forms directly, which needs no server and so
should not have one in front of it. Keeping the Worker to one job means
the site's revenue path cannot be taken down by a Worker deploy.

There is no read path here, no listing endpoint, and no way to get a
file back out of *this* Worker over HTTP.

That is the important design decision. The bucket holds strangers'
names, phone numbers and CVs, so the failure mode worth engineering out
is "someone found a public URL", not "someone uploaded a 6MB file".

Reading a résumé back is the **lead relay's** job. It holds a read-only
binding on the same bucket and serves one download route,
`GET /resume/:leadId`, gated by Cloudflare Access — so the office
clicks a link on the CRM record. The R2 dashboard and
`wrangler r2 object get` are still there for support. The bucket stays
private in every one of those cases; what changed is that a person no
longer needs a Cloudflare login to read a CV.

## Deploy

```sh
npm install
npx wrangler login

# One private bucket. Do NOT attach a custom domain or enable the
# r2.dev public URL on it.
npx wrangler r2 bucket create client-resumes

# The bot defence. Get the pair from the Cloudflare dashboard
# (Turnstile → Add site). The site key goes in the site's
# NEXT_PUBLIC_TURNSTILE_SITE_KEY; the secret goes here.
npx wrangler secret put TURNSTILE_SECRET

# Where the "new application" notification goes. A Web3Forms endpoint,
# a Slack incoming webhook, or the CRM — anything that takes JSON.
npx wrangler secret put NOTIFY_WEBHOOK

# Any long random string. This is what lets the bucket record "these
# uploads came from one place" without recording where that place is.
# Unset, no IP-derived value is stored at all.
npx wrangler secret put IP_HASH_SALT

npx wrangler deploy

# NOT OPTIONAL. Applies the 365-day expiry to the bucket. Skip this and
# applications accumulate forever, which makes the twelve months the
# privacy policy promises untrue. See "Retention" below.
npm run retention
```

Then put the deployed URL in the site's `NEXT_PUBLIC_CAREERS_ENDPOINT`,
rebuild the site, and flip `/careers/` to `live: true` in
`client-site/lib/routes.ts`.

## Configuration

Set in `wrangler.toml` under `[vars]`:

| Var | Meaning |
|---|---|
| `ALLOWED_ORIGINS` | Comma-separated, exact scheme+host, no wildcards. Browser-case protection only — see the validation list below. |
| `MAX_UPLOAD_BYTES` | Default 5 MB. Keep it in step with `MAX_RESUME_BYTES` in `lib/submitApplication.ts`. |
| `RATE_LIMIT_PER_HOUR` | Only does anything when the KV namespace is bound. |

Secrets (`wrangler secret put`, never in the toml):

| Secret | Meaning |
|---|---|
| `TURNSTILE_SECRET` | **Required.** Unset, the Worker refuses every upload (500) and tells applicants to email the office. The dev env opts out with `ALLOW_INSECURE_NO_CAPTCHA`; never set that on the deployed Worker. |
| `NOTIFY_WEBHOOK` | Unset = the file is stored silently and only the Workers log knows. |
| `IP_HASH_SALT` | Salt for the stored IP digest. Unset = nothing IP-derived is stored, which is safe but loses the "same source" signal. |

### Two configuration traps

**A named environment does not inherit top-level bindings.** `[env.dev]`
needs its own `[[env.dev.r2_buckets]]`, or `env.RESUMES` arrives
`undefined` and every upload dies at the R2 put with a 502. Same for any
`[env.staging]` added later.

**`ALLOWED_ORIGINS` unset means the Worker refuses everything**, by
design. It does not fall back to allowing all origins — an
unconfigured Worker that accepts uploads from anywhere is worse than one
that is down.

## What it validates, and in what order

1. `OPTIONS` → CORS preflight. Anything but `POST` → 405.
2. Origin against the allowlist. Worth being honest about: this stops
   another *website's* browser posting on a visitor's behalf and
   nothing else — a script sets the header to whatever it likes.
   Turnstile is the layer that actually gates this endpoint.
3. `Content-Length` before the body is read. An optimisation, not a
   control — a chunked request carries no `Content-Length`, so the real
   limit is the post-parse size check (verified: still returns 413).
4. Per-IP rate limit, if a KV namespace is bound.
5. Honeypot field → answers `200 {ok:true}` and stores nothing, so a bot
   learns nothing from the response.
6. Turnstile. Required; see above.
7. Name and phone present.
8. File extension, then **magic bytes**. Extension and `Content-Type`
   are both supplied by the uploader, so only the bytes are evidence:
   `%PDF`, and `PK\x03\x04` for docx. `.doc`, `.docm`, `.dotm`, `.rtf`
   and `.pages` are refused by name with a message telling the
   applicant to save as PDF.
9. Every text field is scrubbed of control characters, and metadata
   values are percent-encoded to printable ASCII — R2 custom metadata
   travels in HTTP headers, so a newline is header injection and an
   accented name would otherwise fail the put.
10. The R2 key is generated here — `applications/YYYY/MM/<uuid>-<safe
   name>`. A filename from a form field is never a path.

Errors returned to the browser are deliberately vague; the real reason
goes to `wrangler tail`.

## Local development

```sh
npm run dev          # wrangler dev --env dev, port 8787
npm run typecheck
npm run tail         # production logs
npm run retention    # applies the R2 expiry rule (see Retention)
```

`--env dev` allows `http://localhost:3000` and `:4173` and uses a
separate `client-resumes-dev` bucket, simulated on disk by miniflare.

## Retention

Applications are deleted after **365 days**, enforced by an R2 lifecycle
rule rather than by anyone remembering:

```sh
npm run retention                                  # applies the rule
npx wrangler r2 bucket lifecycle list client-resumes  # confirms it
```

Three places carry that number and all three must agree: `RETENTION_DAYS`
in `src/index.ts`, `RETENTION_DAYS` in `scripts/set-retention.sh`, and
`APPLICATION_RETENTION` in the site's `app/privacy/page.tsx`. Each stored
object also carries a `retainUntil` date in its metadata, so an object
says for itself when it should be gone.

The submitting IP is deliberately on a shorter clock. The object gets a
salted hash (`ipHash`) — enough to spot a burst from one source, useless
for identifying anyone without the salt — while the raw address goes to
KV under `srcip:<key>` with a 30-day TTL and expires on its own. Set
`IP_HASH_SALT`, or nothing IP-derived is recorded at all.

## Reading applications

Normally nobody does this by hand: the lead relay's
`GET /resume/:leadId` serves the file as a download behind Cloudflare
Access, and that URL is on the CRM record. Reach for wrangler when the
relay cannot answer — a lead id that predates the route, a file the
office needs while D1 is down, or a support question about the object
itself:

```sh
npx wrangler r2 object list client-resumes --prefix applications/2026/
npx wrangler r2 object get client-resumes <key> --file resume.pdf
```

Applicant details ride on the object as custom metadata — name, phone,
email, role, original filename, timestamp, IP — so an object is never an
orphan blob whose owner is only recoverable from an email somewhere.

Those values are percent-encoded, so a plain name reads normally in the
dashboard and `José` appears as `Jos%C3%A9`. Run it through
`decodeURIComponent` (or `python3 -c "import urllib.parse,sys;
print(urllib.parse.unquote(sys.argv[1]))" '<value>'`) to read it back.

## What this does NOT do

**Nothing scans these files.** The magic-byte check proves a file is a
genuine PDF or DOCX, which is precisely why it is not a safety
guarantee — a real PDF can carry an exploit and a real Office document
can carry a macro. `.doc` is refused outright because the legacy OLE
format is the worst offender, but the residual risk sits with whoever
in the office opens the attachment.

Mitigation is procedural, not technical: preview résumés in a browser
or Google Docs rather than opening them in Word, and keep the machines
that do open them patched.

## Before this handles a real application

- [ ] `TURNSTILE_SECRET` set, and `ALLOW_INSECURE_NO_CAPTCHA` absent
      from the deployed config. Without the secret the Worker refuses
      everything, which is safe but means nobody can apply.
- [ ] A WAF rate-limiting rule on the route. The KV limiter runs *after*
      the request has already reached the Worker and cost money; a WAF
      rule stops it before that.
- [ ] Bucket confirmed private — no custom domain, no r2.dev URL.
- [ ] `IP_HASH_SALT` set. Without it no IP-derived value is stored at
      all, which is safe but loses the "same source" signal.
- [ ] `npm run retention` run against the real bucket, and
      `wrangler r2 bucket lifecycle list client-resumes` showing the rule.
      Until that is applied, applications accumulate forever and the
      twelve months the privacy policy promises is not true.
- [ ] `NOTIFY_WEBHOOK` set, and a test application actually arriving in
      the inbox somebody reads.
