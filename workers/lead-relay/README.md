# Lead relay

Every enquiry the site produces, in one list, forwarded to whichever CRM
gets chosen.

Two things happen on this site that somebody has to act on: a customer
sends a request, and somebody applies for a job. Without the relay they go
to two different places — an email inbox and an R2 bucket — and neither
was a list you could work through. This is that list.

```
  contact form ─────────────────► Web3Forms ──► office inbox
        │                                          (unchanged)
        └──────────────┐
                       ▼
  careers form ──► careers Worker ──► R2 (the résumé file)
        │                │                   ▲
        │                └──────────┐        │ read-only
        │                           ▼        │
        └──────────────────────► lead relay ─┘
                                      │
                                      ├────────► D1 (the lead book)
                                      │
                                      ├────────► CRM webhook
                                      │            (leads)
                                      └────────► CRM webhook
                                                   (applications, optional)

  office ── clicks the link on a CRM record ──► Cloudflare Access
                                                     │
                                          GET /resume/:leadId
```

## Why it stores before it forwards

The order is the design: **write the row, answer the caller, forward
afterwards.**

A relay that only forwards loses everything the CRM was not awake for.
Storing first means an outage at the far end costs a *delivery* rather
than a *lead* — the row sits at `crm_status='failed'` and the retry
sweep, which runs every fifteen minutes, picks it up when the CRM comes
back.

It is also deliberately **not** on the critical path for either form.
The contact form still posts to Web3Forms and that email arrives whether
or not this Worker is reachable; the careers Worker still writes the
résumé to R2 before it pings here. This is the second copy, on purpose,
because the first copy must not depend on code we maintain.

## Why it is CRM-agnostic

The CRM has not been chosen. Writing straight to any one CRM's API
would mean either waiting for that decision — losing every lead in the
meantime — or rewriting both forms once it is made.

So leads are captured now and forwarded through a **webhook**: one flat
JSON POST per row, the same shape for both kinds, to `CRM_WEBHOOK_URL`.
That is what a Zapier or Make catch hook wants, and most CRMs either
take an inbound webhook directly or sit behind one of those two. Nothing
collected before the URL is set is lost — the next retry sweep delivers
the entire backlog the moment it is. `/export.csv` hands the same
backlog to anything that prefers an import.

The forward is an **adapter** in `src/crm/` — `generic`, the only one
shipped, picked by `CRM_ADAPTER` (leave it unset). It owns its request
shaping, endpoint and auth; it does not touch the database and may not
throw — every outcome comes back as a `CrmOutcome` and `forward()`
records it in one place. That is what keeps the retry sweep a plain
query over `crm_status`. If a client ever needs a CRM's own API rather
than a webhook, that is a file next to `generic.ts` and a line in
`src/crm/index.ts`.

A value of `CRM_ADAPTER` that names no adapter is treated as *no CRM*
rather than quietly falling back to `generic`, because a typo would
otherwise throw every lead at whatever `CRM_WEBHOOK_URL` happened to
hold. Rows park as `disabled` and the log says so.

### Applicants do not have to go where customers go

`CRM_APPLICATION_WEBHOOK_URL` is optional. Set it and `kind='application'`
rows go there instead; unset, they follow the leads, which is the
previous behaviour exactly.

Worth setting once a real CRM is live. Job applicants in a sales CRM's
contact list burn a free tier's contact cap, and they carry retention
obligations a customer does not — the site promises an applicant's file
is deleted after twelve months, and that promise only covers storage we
control.

## Routes

| Route | Who calls it | Auth |
| --- | --- | --- |
| `POST /lead` | the contact form, from a browser | CORS origin allowlist |
| `POST /application` | the careers Worker, server-to-server | `X-Ingest-Secret` |
| `GET /export.csv` | a person, occasionally | `Authorization: Bearer` |
| `GET /resume/:leadId` | a person, from a link on a CRM record | **Cloudflare Access** |
| `GET /health` | uptime checks | none |

`POST /lead`'s origin check stops another *website* posting on a
visitor's behalf and nothing else — a script sets `Origin` to whatever
it likes. The KV rate limiter is a backstop; a WAF rate-limiting rule on
the route is better, because it stops the request before it bills.

`GET /resume/:leadId` is the one route with **no auth in this code**, and
that is the design rather than an omission — see below. Do not put
Access in front of `/lead` or `/application`: the first is posted to by
a visitor's browser and the second by the careers Worker, and a sign-in
page in front of either breaks the form for everyone while every
application silently 302s into HTML.

The only content rule is reachability, and it differs by kind. A `/lead`
must carry an **email address** — the contact form requires one, the CRM
deduplicates on it, and a lead the office cannot email costs a second
call to repair. An `/application` keeps the older floor of a phone
number *or* an email, because the careers form asks for the address
optionally on purpose. Everything else on both forms is optional
somewhere.

## Setup

**The order matters.** Secrets attach to a Worker, so the Worker has to exist
before any of them can be set — and `deploy` will not run until D1 does.
Database, then deploy, then secrets.

```bash
npm install

# 1. The database. `deploy` fails until this id is real: wrangler.toml ships
#    with a placeholder, not an id.
npx wrangler d1 create client-leads      # paste the id into wrangler.toml
npm run schema                        # creates the table and indexes

# 2. Deploy, which is what creates the Worker.
npx wrangler deploy

# 3. Secrets. Do NOT pass --env: omitting it targets the top-level
#    (production) environment, which is the one you want. Earlier revisions of
#    this file said to pass --env="" for that; wrangler rejects it outright
#    ("No environment found in configuration with name \"\""), and PowerShell
#    strips the quotes before wrangler ever sees them anyway. Confirm where
#    they landed with `npx wrangler secret list` — no --env there either.
#
#    Each command takes the secret's NAME. The value goes in at the hidden
#    prompt that follows — never on the command line, where it lands in shell
#    history.
npx wrangler secret put INGEST_SECRET  # any long random string
npx wrangler secret put EXPORT_TOKEN   # any long random string

#    Then the CRM webhook, whenever one exists:
npx wrangler secret put CRM_WEBHOOK_URL
npx wrangler secret put CRM_AUTH_TOKEN   # only if the target wants a bearer token

#    Optional: send job applicants somewhere other than the sales CRM
npx wrangler secret put CRM_APPLICATION_WEBHOOK_URL

# 4. Re-deploy is not needed for a SECRET — those take effect immediately.
#    [vars] entries are shipped with the Worker code, so changing one does
#    need another `wrangler deploy`.
```

One `[vars]` entry in `wrangler.toml` matters for the résumé link:

- `RELAY_PUBLIC_ORIGIN` — this Worker's own public origin, which is what
  `resumeUrl` is built from. It must be the hostname the Access
  application covers; point it at a `workers.dev` address and every link
  in the CRM bypasses the sign-in. Unset, rows still forward and still
  carry `resumeKey`, they just arrive with no link — and the log says so
  on every one.

Then create the Access application, per `docs/LAUNCH-CREDENTIALS.md`.
Nothing in this Worker refuses to run without it; the route is simply
open to anybody holding a lead id until it exists.

Then connect the two producers:

- **Contact form** — set `NEXT_PUBLIC_LEAD_WEBHOOK_URL` to
  `https://<relay>/lead` in the Cloudflare Pages environment variables
  (Production *and* Preview), and redeploy the site.
- **Careers Worker** — in `workers/careers-upload`:
  ```bash
  npx wrangler secret put NOTIFY_WEBHOOK        # https://<relay>/application
  npx wrangler secret put RELAY_INGEST_SECRET   # the SAME value as INGEST_SECRET
  ```

An unconfigured CRM — no `CRM_WEBHOOK_URL` — is a supported state, not a
half-finished one. Leads are stored with
`crm_status='disabled'` and delivered in full the first time the secret
exists.

## Getting a résumé out

`GET /resume/:leadId` looks the lead up in D1, reads its `resume_key`,
and streams the object out of R2 as an attachment named for the
applicant — `Jane-Doe-resume.pdf`, not `9f2c…-cv.pdf`. The `resumeUrl`
on every forwarded record points at it.

What it says when it cannot serve a file:

| | |
| --- | --- |
| `404` | no such lead, or that lead has no résumé. One answer for both, so the route cannot be used to ask whether an id exists |
| **`410`** | the row has a key and R2 has no object — the 365-day lifecycle rule has expired it. Says so in words |
| `503` | the `RESUMES` binding is missing on this deployment. The file is fine; fetch it with wrangler |

The 410 is the point of the whole table. A row with a key and no object
is the retention rule having worked: applications are deleted after
twelve months, deliberately, and the privacy policy promises exactly
that. A 404 there would read as a broken link and send somebody hunting
for a file that was destroyed on purpose. A truthful 410 beats a broken
download.

### Why Cloudflare Access, and not code

The office reaches this by **clicking a link inside a CRM record**. A
browser following a link cannot attach an `Authorization` header, so a
bearer token on this route would only ever be a token *in the URL* — a
live credential sitting in every CRM record, browser history and
forwarded email that ever touched the lead. Signed R2 URLs do not solve
it either: R2's S3-compatible signing tops out at seven days, and a
résumé link that dies after a week is worse than one that never claimed
to exist, because it fails long after anybody is watching.

So the gate is a Cloudflare Access application in front of the route —
free up to 50 users, authenticating against Google Workspace, no code.
Setup is in `docs/LAUNCH-CREDENTIALS.md`.

Two consequences that follow from the gate living outside this code:

- **This Worker cannot tell whether Access is there.** The lead id in
  the path is an unguessable v4 UUID, which is worth having and is not
  access control.
- **`*.workers.dev` must be off.** Access binds to hostnames on a zone;
  a `workers.dev` address is not on the zone and is not covered by the
  policy, so it would be an ungated door beside the gated one. The
  `[[routes]]` block and `workers_dev = false` in `wrangler.toml` are
  commented out, to be enabled at the same time as the application.

A `Cf-Access-Jwt-Assertion` header check was considered as a
belt-and-braces gate and rejected: a header check is not a signature
check, so it would refuse an honest misconfiguration while waving
through anyone who can reach the Worker off-zone and set a header —
exactly the case it would be there to catch. Verifying that JWT properly
is the real upgrade, and it needs the team domain and audience tag as
configuration.

The bucket stays private throughout. There is no `r2.dev` URL and no
custom domain on it, which is what keeps the privacy policy's promise
that a CV sits somewhere "only we can reach" true.

## Getting the leads out

```bash
curl -H "Authorization: Bearer $EXPORT_TOKEN" \
     https://<relay>/export.csv -o leads.csv
```

Cells beginning `=`, `+`, `-` or `@` are prefixed with an apostrophe.
That is not cosmetic: spreadsheets treat those as formulas, and this
table is filled in by strangers through a public form — the exact threat
model CSV injection was written for.

This is the only way the *table* leaves the Worker — `/resume/:leadId`
serves one file and never a record. The table holds names, phone numbers
and addresses; with `EXPORT_TOKEN` unset, `/export.csv` refuses
everything rather than serving customer records to anyone who guesses the
path.

## What was verified, and how

Run locally against a stand-in CRM (`wrangler dev --env dev --local
--test-scheduled`):

- a contact lead and a job application both stored and forwarded, in one
  normalised shape
- a record with no phone and no email refused, and a `/lead` with a
  phone but no email refused while the same body on `/application` was
  accepted
- `/application` without the shared secret → 401; `/export.csv` without
  the bearer token → 401; unknown route → 404; wrong method → 405
- **the outage case**: with the CRM returning 503, the caller still got
  `{"ok":true}`, the row was written as `failed`, and after the CRM
  recovered the scheduled sweep delivered it — along with rows captured
  before any CRM was configured, oldest first
- CSV injection: `=cmd|'/c calc'!A1`, `@SUM(1+1)` and a leading `+`
  all neutralised in the export; newlines and tabs collapsed
- the real contact form, driven in Chromium, reached the relay and the
  CRM with its source URL attributed, while Web3Forms got its own copy

## Tests

```bash
npm test        # node runs the TypeScript directly; no build, no framework
npm run typecheck
```

`test/crm.test.ts` covers the parts of the adapter that can be checked
without a CRM: the webhook's wire format, where each kind is sent, the
delivery flow against a stand-in webhook told to refuse or drop the
connection, and which rows the retry sweep picks up. It is not
integration testing — the first real lead through the real webhook is
still the check that matters.

The résumé route and the adapters were added later, and D1 is still
unprovisioned, so those
were driven against **stub D1 and R2 bindings** rather than the real
ones — the module's own `fetch` and `scheduled` handlers, called
directly, with `fetch()` captured to see what a CRM would have received:

- an application stored and forwarded with
  `resumeUrl = https://<origin>/resume/<id>`, `resumeKey` intact beside
  it, and the row marked `sent`
- `GET /resume/:leadId` → 200, `Content-Type` from R2,
  `Content-Disposition: attachment; filename="Jane-Doe-resume.pdf"`,
  `no-store`, `nosniff`, and the file's bytes
- **the expiry case**: the same lead with the object removed from the
  bucket → `410` and text naming the twelve-month rule, not a 404
- 404 for an unknown lead, an empty id, a lead with no `resume_key`, an
  over-long id and an encoded `../../` traversal; 405 on POST; 503 with
  the wrangler fallback when `RESUMES` is unbound
- `RELAY_PUBLIC_ORIGIN` unset → empty `resumeUrl`, `resumeKey` still
  there, and a warning in the log
- an unknown `CRM_ADAPTER` parked rows as `disabled` rather than
  falling back to `generic`, and said so
- with both webhook URLs set, the application went to the applicant URL
  and the lead to the sales URL; with only the applicant URL set, the
  lead was stored `disabled` and never forwarded, and the sweep's query
  asked for `kind IN ('application')` alone rather than filling its
  batch with rows it would decline to send
- a row whose `answers` never parsed as an object forwarded anyway,
  with the text intact in both shapes — a bare `JSON.parse` there is a
  row that fails six times and then sits forever with a `SyntaxError`
  where the CRM's own reason should be
- the outage case again: with the CRM returning 503 the caller still got
  `{"ok":true}`, the row went to `failed` with `503` in `crm_error`, and
  the sweep delivered it once the CRM recovered
- `/export.csv`, `/health`, the 401s and the unknown-route 404 all
  unchanged

All passing. What that does *not* cover is anything only
the real bindings can show — D1's own behaviour, R2 streaming at size,
and whether Access is actually in front of the route. An end-to-end
run against the real bindings — a lead through D1 to the CRM, and a
`/resume/` request refused by Access from a signed-out browser — is
still owed before launch.

## Operating notes

`crm_attempts` stops at 6. The generic adapter spends an attempt on
every non-2xx answer and every network failure, a 429 included; the
adapter contract (`spendsAttempt` in `src/crm/types.ts`) lets a future
adapter treat a throttle as "not now" instead. Something that has
refused six times is a configuration problem, and retrying forever
hides it — the rows stay
visible as `failed` with the CRM's own error text in `crm_error`, which
is usually where a CRM says *why*.

```sql
-- what has not landed
SELECT id, kind, name, crm_attempts, crm_error
  FROM leads WHERE crm_status = 'failed' ORDER BY received_at;
```

```bash
npx wrangler tail   # live logs
```
