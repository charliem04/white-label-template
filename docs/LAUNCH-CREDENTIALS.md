# Launch credentials — what has to exist, and who creates it

One page, for the working session. Every variable named here is already
documented in `site/.env.example`, `workers/lead-relay/README.md` or
`workers/careers-upload/README.md`; this file is the *acquisition* order, not
the configuration reference.

Three columns matter: **who** creates it, **when** it is needed, and **what
breaks without it**. A blank here is not a half-finished state — in almost
every case the code was written to fail honestly rather than silently, so the
site is safe to ship with gaps. It just cannot take a lead.

---

## 1. The client brings these to the meeting

Nothing on this list can be created by anyone else, and several have lead
times measured in days.

| Item | Needed for | Notes |
|---|---|---|
| Domain registrar login for example.com | Cutover | Confirm the domain is unlocked and the auth/EPP code is retrievable |
| **Full DNS record export from the current host** | Cutover | MX, SPF, DKIM, DMARC and any vendor CNAMEs. See the warning below |
| the client's legal name + EIN | Google Business Profile, any vendor account | |
| The Google account that owns the Business Profile | Reviews, Search Console, Maps embed | If nobody knows who owns it, start the GBP reclaim process immediately — it takes days |
| LA contractor licence number | `client.config.ts → badges` | No licence line prints until this exists |
| Attorney contact | Legal sign-off | Four documents to review; start this first |
| Current web host + contract end date | Rollback window | Do not cancel until 30 days after cutover |

> ### The one that will actually hurt
>
> Moving the nameservers to Cloudflare without first recreating the client's **MX,
> SPF, DKIM and DMARC** records means company email stops arriving. Not
> degrades — stops. Get the zone export before anything else in this document,
> and recreate every non-web record in Cloudflare *before* the nameservers
> move, not after.

---

## 2. Created together, in the room

These need the client present (their account, their billing, their decision) but take
minutes each once he is sitting there.

| Item | Variable it fills | Without it |
|---|---|---|
| Cloudflare account, **in the client's name**, the developer added as a member | — | the client is locked to the developer's personal account. Do this even if it costs an hour |
| Web3Forms access key for the office inbox | `NEXT_PUBLIC_WEB3FORMS_KEY` | **The contact form refuses to submit** and shows the phone number. The site cannot take a lead. Full runbook: **`docs/WEB3FORMS-SETUP.md`** |
| Web3Forms spam protection switched on | — | The contact form's only defence today is a honeypot |
| Google Cloud project → Places API (New) → API key, restricted to HTTP referrers | `NEXT_PUBLIC_GOOGLE_PLACES_KEY` | Reviews band degrades to a link. Harmless, just weaker |
| **Budget alert on that key, set the same day** | — | This is the only thing on the site that bills per visitor |
| Place ID, verified against the real listing | `NEXT_PUBLIC_GOOGLE_PLACE_ID` | A wrong ID shows **a different business's reviews under the client's name**. Verify, do not assume |
| Cloudflare Turnstile site + secret pair | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + Worker secret | The careers Worker refuses every upload rather than running open |
| Sanity project owned by the client, + a Sanity account invited for each person who edits content | gallery sign-in | An email invite per editor, free on Sanity's starter plan. This replaced a GitHub account with repository write access per editor, which was the friction that kept the gallery unedited |
| CRM account + its webhook or Zapier/Make URL | `CRM_WEBHOOK_URL` (Worker secret) | Supported blank state: leads still stored, delivered in bulk the first time it is set |
| **HubSpot free account** + service key, if HubSpot is the demo CRM | `CRM_AUTH_TOKEN` (Worker secret) + `CRM_ADAPTER = "hubspot"` | Same supported blank state. Created in the client's name, not the developer's — this account owns the client's contact database. Full runbook, scopes and the four custom properties: **`docs/HUBSPOT-SETUP.md`** — note that a new portal issues a *service key*, not a private app token, since HubSpot disabled the latter for new accounts on 28 September 2026. Add HubSpot to the privacy policy before the key is set (§6) |
| Analytics account (Plausible paid / GA4 free) | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | No analytics. Banner still behaves correctly |
| Call-tracking provider, if adopted | `client.config.ts → tracking.dniScriptUrl` | Every number on the site stays the real one, which is the correct default |
| Résumé handling decision | `NEXT_PUBLIC_CAREERS_ENDPOINT` | `/careers/` is a **live nav item** — the form refuses and points at email until this is resolved |
| **Who may read a résumé**, and the Google accounts they use | Cloudflare Access policy (§6) | Nobody can open a CV from a CRM record. The file is safe in R2 and reachable with wrangler, which is not a thing the office can do |

---

## 3. The developer generates afterwards

No client involvement. Listed so nothing is forgotten at wiring time.

| Secret | Where it goes | Rule |
|---|---|---|
| `INGEST_SECRET` | lead-relay | Must equal `RELAY_INGEST_SECRET` on careers-upload, or applications are refused with a 401 |
| `RELAY_INGEST_SECRET` | careers-upload | ″ |
| `EXPORT_TOKEN` | lead-relay | Gates `/export.csv`, the only way the lead *table* leaves the Worker. Unset = refuses everything. The other read path, `/resume/:leadId`, serves one file and is gated by Access (§6) |
| `IP_HASH_SALT` | careers-upload | Unset = no IP-derived value stored at all. Safe, but loses the "same source" signal |
| `NOTIFY_WEBHOOK` | careers-upload | Point at the relay's `/application` route |
| `RELAY_PUBLIC_ORIGIN` | lead-relay `[vars]` | The relay's own hostname, and it must be the one Access covers (§6). Unset, forwarded records carry `resumeKey` but no clickable link — and the Worker log says so on every one |
| `CRM_ADAPTER` | lead-relay `[vars]` | `generic` (default) or `hubspot`. Wrong value = the CRM quietly receives the wrong shape, which is the slowest failure here to notice |
| `CRM_APPLICATION_WEBHOOK_URL` | lead-relay | Optional. Unset, job applicants land in the sales CRM alongside customers — see §6 for why that is worth avoiding |
| D1 `database_id` | `workers/lead-relay/wrangler.toml` | **Currently a placeholder string.** `wrangler d1 create client-leads`, paste the real id, `npm run schema` |
| `SANITY_PROJECT_ID`, `SANITY_DATASET` | Pages build env | Public identifiers, in every gallery photo URL. Build-time only |
| `SANITY_READ_TOKEN` | Pages build env, **encrypted** | Only if the dataset is private. Viewer role, read-only. **Not** `NEXT_PUBLIC_` — `scripts/harden.mjs` fails the build if it reaches `out/` |
| Cloudflare Pages deploy hook URL | Sanity webhook | The whole reason a publish appears on the site. Treat the URL as a secret: anyone holding it can trigger builds |

---

## 4. Mirror everything into Cloudflare Pages

Settings → Environment variables, for **Production *and* Preview**. A preview
missing a variable behaves differently from production, which defeats the
entire point of checking it there.

```
NEXT_PUBLIC_WEB3FORMS_KEY
NEXT_PUBLIC_LEAD_WEBHOOK_URL
NEXT_PUBLIC_CAREERS_ENDPOINT
NEXT_PUBLIC_TURNSTILE_SITE_KEY
NEXT_PUBLIC_GOOGLE_PLACES_KEY
NEXT_PUBLIC_GOOGLE_PLACE_ID
NEXT_PUBLIC_PLAUSIBLE_DOMAIN
SANITY_PROJECT_ID
SANITY_DATASET
SANITY_READ_TOKEN
```

Pages build settings, since the Next project is not at the repo root:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `out` |
| **Root directory (advanced)** | `client-site` |

Node comes from `.nvmrc` (20). If Pages ignores it, set `NODE_VERSION=20`.

---

## 5. Two things to add that are not credentials

- **WAF rate-limiting rules** on both Worker routes. The KV limiters in both
  `wrangler.toml` files are commented out in production, so `overRateLimit()`
  is currently a no-op on both Workers. Either create the namespaces and
  uncomment the bindings, or add the WAF rules — which is the better place
  anyway, because a WAF rule stops the request before it bills. Do not leave
  it ambiguous.
- **Uptime monitoring** on the site and both Workers. The relay already
  exposes `GET /health` for exactly this. Decide who gets the alert.

---

## 6. Cloudflare Access on the résumé route

The lead relay serves `GET /resume/:leadId`, which streams a job
applicant's CV out of the private R2 bucket. That URL is what
`crmPayload()` now puts on every forwarded record, so the office opens a
résumé by clicking a link on a CRM record instead of learning the R2
dashboard.

**The route has no authentication of its own.** That is the design, not
an omission: a browser following a link cannot attach an `Authorization`
header, so a token there would be a token *in the URL* — a live
credential in every CRM record, browser history and forwarded email that
ever touched the lead. Cloudflare Access puts a Google sign-in in front
of the route instead, and costs nothing at the client's size.

| | |
|---|---|
| **What to create** | Zero Trust → Access → Applications → **Self-hosted** |
| **Application name** | `the client résumé downloads` |
| **Domain** | the relay's hostname, path `resume` — i.e. `relay.example.com/resume`. A path-scoped application covers everything under it |
| **Identity provider** | Google (Workspace). Free tier covers 50 users; the client will use a handful |
| **Policy** | Action **Allow**, rule *Emails ending in* `@example.com` — or *Emails* with the specific addresses if the client's mail is not on its own domain |
| **Session duration** | 24 hours. Long enough that nobody signs in twice in a working day, short enough that a borrowed laptop is not a standing grant |
| **Who gets access** | whoever handles hiring, and the developer. Not "everyone at the client" — this is the only route on the whole site that serves one person's private document to another |

Three things that have to be true at the same time, and the first is the
one that gets forgotten:

1. **`*.workers.dev` must be off.** Access binds to hostnames on a zone.
   A `workers.dev` address is not on the zone, is not covered by any
   policy, and serves the identical code — an ungated door beside the
   gated one. `workers/lead-relay/wrangler.toml` carries a `[[routes]]`
   block and `workers_dev = false`, both commented out, to be enabled at
   the same moment the application is created. Not before: without a
   route the Worker has no hostname at all.
2. **`RELAY_PUBLIC_ORIGIN` must be that same hostname.** It is what the
   links in the CRM are built from. Point it at `workers.dev` and every
   record carries a link that bypasses the sign-in.
3. **Do not protect `/lead` or `/application`.** Scope the application to
   the `resume` path and nothing else. `/lead` is posted to by a
   visitor's browser and `/application` by the careers Worker, server to
   server; an Access sign-in page in front of either breaks the contact
   form for every visitor and turns every job application into a silent
   302 into HTML. Both already have their own gate — an origin check and
   a shared secret.

**Without it:** the route answers anybody who has a lead id. Those ids
are unguessable v4 UUIDs, so this is not an open directory of CVs — but
an unguessable URL is not access control, and the ids travel in CRM
records, in `/export.csv` and in the JSON the contact form gets back.
Treat the application as required before the first real application
arrives.

**What it does not change:** the bucket stays private. No `r2.dev` URL,
no custom domain on it, and the relay's binding is read-only by
convention — it only ever calls `get()`. The privacy policy tells
applicants their CV sits somewhere "only we can reach", and an
Access-gated Worker route keeps that sentence true where a public bucket
would not.

One related decision worth making in the same sitting: set
`CRM_APPLICATION_WEBHOOK_URL` on the relay so job applicants go
somewhere other than the sales CRM. Unset, they land in the same contact
list as customers, where they burn a free tier's contact cap and sit
under a retention policy written for leads. The site promises an
applicant's file is deleted after twelve months, and that promise only
covers storage we control.

---

## 7. Privacy policy must be updated before two of these switch on

`app/privacy/page.tsx` names Web3Forms, Calendly, Plausible, Cloudflare and
R2. It does **not** mention Google Places or the lead relay/CRM. Both are
processors handling visitor data:

- Google Places sends the visitor's IP to Google on every page view that
  renders reviews
- The relay stores names, phone numbers and addresses, and forwards them to a
  third-party CRM — name the CRM once it is chosen. If that is HubSpot, it is
  a US processor receiving the name, phone, email, address and whatever the
  visitor typed in the message box

Add both paragraphs *before* setting the corresponding keys, not after. The
file's own header comment already says to do this whenever a processor is
added.
