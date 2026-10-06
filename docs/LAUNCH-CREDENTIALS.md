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
| The client's legal name + EIN | Google Business Profile, any vendor account | |
| The Google account that owns the Business Profile | Review link, Search Console, Maps embed | If nobody knows who owns it, start the GBP reclaim process immediately — it takes days |
| Licence / certification numbers, if the trade is licensed | `client.config.ts → badges` | No badge line prints until these exist |
| Attorney contact | Legal sign-off | Terms, privacy, and the careers questions if `/careers/` will go live; start this first |
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
minutes each once they are in the room.

| Item | Variable it fills | Without it |
|---|---|---|
| Cloudflare account, **in the client's name**, the developer added as a member | — | the client is locked to the developer's personal account. Do this even if it costs an hour |
| Web3Forms access key for the office inbox | `NEXT_PUBLIC_WEB3FORMS_KEY` | **The contact form refuses to submit** and shows the phone number. The site cannot take a lead. Full runbook: **`docs/WEB3FORMS-SETUP.md`** |
| Web3Forms spam protection switched on | — | The contact form's only defence today is a honeypot |
| Cloudflare Turnstile site + secret pair | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + Worker secret | The careers Worker refuses every upload rather than running open |
| Sanity project owned by the client, + a Sanity account invited for each person who edits content — **only if a gallery studio is being added** (none ships; `docs/GALLERY-CMS.md`) | gallery sign-in | The gallery builds from the committed `content/gallery.generated.json`. An email invite per editor is free on Sanity's starter plan |
| CRM account, **in the client's name**, + its inbound webhook or a Zapier/Make catch-hook URL | `CRM_WEBHOOK_URL` (Worker secret), plus `CRM_AUTH_TOKEN` if the target wants a bearer token | Supported blank state: leads still stored, delivered in bulk the first time it is set. Whoever owns the CRM login owns the client's contact database. Name the CRM in the privacy policy before the URL is set (§7) |
| Plausible account (the only analytics `components/Analytics.tsx` loads) | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | No analytics. Banner still behaves correctly |
| Call-tracking provider, if adopted | `client.config.ts → tracking.dniScriptUrl` | Every number on the site stays the real one, which is the correct default |
| Résumé handling decision | `NEXT_PUBLIC_CAREERS_ENDPOINT` | `/careers/` ships `live: false` and has no page yet. Resolve this before building the page and flipping the flag — until it is set, the form refuses and points at email |
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
| `CRM_APPLICATION_WEBHOOK_URL` | lead-relay | Optional. Unset, job applicants land in the sales CRM alongside customers — see §6 for why that is worth avoiding |
| D1 `database_id` | `workers/lead-relay/wrangler.toml` | **Currently a placeholder string.** `wrangler d1 create client-leads`, paste the real id, `npm run schema` |
| `SANITY_PROJECT_ID`, `SANITY_DATASET` | Pages build env | Only once a gallery studio exists. Public identifiers, in every gallery photo URL. Build-time only |
| `SANITY_READ_TOKEN` | Pages build env, **encrypted** | Only if the dataset is private. Viewer role, read-only. **Not** `NEXT_PUBLIC_` — `scripts/harden.mjs` fails the build if it reaches `out/` |
| Cloudflare Pages deploy hook URL | Sanity webhook | The whole reason a publish appears on the site. Treat the URL as a secret: anyone holding it can trigger builds |

---

## 4. Mirror everything into Cloudflare Pages

Settings → Environment variables, for **Production *and* Preview**. A preview
missing a variable behaves differently from production, which defeats the
entire point of checking it there.

```
NEXT_PUBLIC_WEB3FORMS_KEY
NEXT_PUBLIC_FORM_ENDPOINT        (only if not Web3Forms)
NEXT_PUBLIC_LEAD_WEBHOOK_URL
NEXT_PUBLIC_CAREERS_ENDPOINT
NEXT_PUBLIC_TURNSTILE_SITE_KEY
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
| **Root directory (advanced)** | `site` |

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
| **Application name** | `<Client name> résumé downloads` |
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

## 7. The privacy policy must be written before any of these switch on

`app/privacy/page.tsx` ships as a **stub** — the rendered page is a
`TODO(client)` placeholder. Its header comment is the checklist: it lists
every processor this template's infrastructure can introduce (Web3Forms, the
lead relay and its CRM, R2 résumé storage, Turnstile, Plausible, call
tracking, the booking embed, and the localStorage consent flag). Every one
that is switched on for this client needs a paragraph; every one that is off
must not be mentioned.

The one the comment cannot fill in for you is the CRM: the relay stores names,
phone numbers and addresses and forwards them to whichever CRM is configured,
so name it once it is chosen — and name Zapier or Make too if the webhook
runs through one, since that is a second processor receiving the name, phone,
email, address and whatever the visitor typed in the message box.

Write each paragraph *before* setting the corresponding key, not after.
