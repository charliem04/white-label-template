# HubSpot setup — wiring the lead relay to a real CRM

The lead relay stores every enquiry in D1 and forwards it to whatever CRM is
configured. This file is the *whatever*: how to create the HubSpot account,
give the Worker a token, create the four properties the code writes to, and
prove a real lead lands — start to finish, without needing to know the
codebase.

Everything HubSpot-specific lives in `workers/lead-relay/src/crm/hubspot.ts`
and two variables. That is deliberate, and section 7 is how it comes back out.

---

## 0. What this is, and what it is not

**HubSpot Free is the demo CRM.** It exists so the client can see a contact
record appear, with a real lead status, from a real form submission — this
week, without a purchase decision. It is not a recommendation to run a field-service
business on it.

What HubSpot does not know about: a claim, a supplement, an adjuster, a scope,
a crew, a material order, a job schedule. A vertical CRM — JobNimbus, AccuLynx, ServiceTitan,
Roofr — is built around exactly those, and the client will almost certainly end
up on one. Section 7 exists because that move was planned for on day one.

**Free tier limits worth knowing before you build on it:**

| | |
| --- | --- |
| Custom properties | **10 per object.** This integration spends 4 of them. Six left for the client — see section 3 |
| Seats | 2 core seats on a free account |
| Contacts | Far more than this business will ever produce; storage is not the constraint. Marketing *email* sends are what free actually caps |
| Automation | None worth relying on. No workflows on free — assignment and follow-up are manual |

HubSpot changes its packaging regularly. Check the current pricing page before
repeating any of these numbers to the client; the one that matters to the code
is the custom-property cap, and that is the one to re-check if a property
refuses to create.

**The credential changed in late 2026, and the deadline matters here.** HubSpot
is removing the ability to create *legacy private apps* — the per-account API
credential this guide used to tell you to make. New accounts lost it on
**28 September 2026**; accounts that already existed lose it on **26 October
2026**. Existing private apps keep working and are not being revoked.

the client's account does not exist yet, which puts it squarely in the first case, so
section 2 uses the replacement: a **service key**. Nothing about the code
changes — it is the same `Authorization: Bearer …` header, the same two scopes,
the same `CRM_AUTH_TOKEN` secret. Only the screen you get it from is different.

**Before switching this on:** `app/privacy/page.tsx` names the processors that
receive visitor data, and HubSpot will be one of them — names, phone numbers,
addresses and whatever somebody typed into the message box, leaving Cloudflare
for a US CRM. Add the paragraph *before* the token is set, not after. The same
rule is in `docs/LAUNCH-CREDENTIALS.md` §6 and it is not a formality.

---

## 1. Create the HubSpot account

1. Go to <https://www.hubspot.com/products/get-started> and create a **free
   HubSpot CRM** account.
2. Use **the client's own email address**, not a personal one, and not the developer's.
   Whoever owns this login owns the client's contact database. The same rule as
   the Cloudflare account in `docs/LAUNCH-CREDENTIALS.md` §2.
3. Skip the onboarding questionnaire and the marketing-email wizard. Nothing in
   this integration needs them.
4. Note the **portal ID**, shown in the bottom-left account menu. Nothing in
   the code uses it — the token identifies the portal — but it is what HubSpot
   support asks for first.

> **Create a fresh account, even if an old free one exists.** An old portal
> is the most likely way to end up somewhere this guide does not describe:
> legacy free portals did not all expose the credential screens in the first
> place, and an account that predates 28 September 2026 follows a different
> deprecation date than a new one (section 0). A new account has exactly one
> path available, which is the one section 2 documents.
>
> Do not work around anything here with an **API key**. HubSpot retired those
> in November 2022; any guide still offering one — and there are many — is
> describing a credential that no longer authenticates.

---

## 2. Create the service key

A **service key** is HubSpot's account-level API credential for a
system-to-system integration like this one: something that reads and writes
data and has no user interface inside HubSpot. It produces a bearer token,
which is exactly what the relay already sends.

It replaces the **private app**, whose creation HubSpot disabled for new
accounts on 28 September 2026 (section 0). If you are following an older
guide — HubSpot's own included, in places — and it tells you to go to
**Settings → Integrations → Private Apps**, that menu is the one that is going
away. The two credentials are interchangeable as far as this code is
concerned.

### Before you start: the permission

Creating a service key requires the **Developer tools access** permission, or
a **Developer Seat**. On a free account with two core seats this is the step
that catches people: the account owner has it by default, a second user
invited later may not, and the Service Keys screen simply does not appear
rather than explaining itself. If the menu in step 1 is missing, check this
first — it is far more likely than anything being wrong with the account.

### Making it

1. In HubSpot: **Settings** (the gear, top right) → **Integrations** →
   **Service Keys**. (The same screen is reachable from the main sidebar at
   **Development → Keys → Service Keys**.)
2. **Create service key**, and name it something a stranger will understand in
   a year, e.g. `the client website lead relay`.
3. Add these scopes, and only these:

   | Scope | Why the code needs it |
   | --- | --- |
   | `crm.objects.contacts.write` | Creating and updating the contact |
   | `crm.objects.contacts.read` | The phone-number search, used when a lead has no email |

   A key that can only touch contacts is a key whose worst case is bounded,
   and this code never reads a deal, a company or a file. Note that a key can
   only be granted scopes **the user creating it already has** — if a scope is
   greyed out, that is a seat or permissions problem on your own login, not a
   tier limit.
4. Create it, then **copy the key**. HubSpot shows it once.

The key is a credential with write access to the client's contact database. It
goes into `wrangler secret put` (section 4) and nowhere else: not into
`wrangler.toml`, not into a commit, not into a chat message, not into a
screenshot pasted to the client. If it leaks, come back to this screen and
rotate it — rotation is built into the service-key screen, which is one of the
reasons HubSpot moved to them.

> **Service keys are in public beta** (since February 2026) while private-app
> creation is being switched off. In practice that means the screen may move or
> gain fields before it settles. It does not affect the token itself or how the
> relay uses it, and the fallback below exists for the same reason.

### Fallback: the legacy private app

Only if the Service Keys screen is genuinely unavailable *and* the account
predates 28 September 2026 — in which case private app creation still works
until **26 October 2026**:

**Settings → Integrations → Private Apps → Create a private app**, the same
two scopes as above, then **Create app → Continue creating → Show token**.
The token starts `pat-`.

Everything downstream is identical. An existing private app is not being
revoked, so if the client already has one wired to something else, there is no
need to migrate it to satisfy this guide.

### What it does not do

A service key does not support **webhooks**. That is irrelevant here — the
relay pushes *to* HubSpot and never asks HubSpot to call back — but it is the
one reason a future integration might need a project-based app instead, so it
is worth knowing before someone assumes the key covers everything.

---

## 3. Create the four custom properties

The code maps most of a lead onto HubSpot's standard contact properties —
`email`, `phone`, `firstname`, `lastname`, `address`, and `message`, which
HubSpot ships for precisely this purpose. That leaves four things HubSpot has
no standard home for.

In HubSpot: **Settings** → **Properties** → **Create property**, with **Object
type: Contact**, for each row below.

| Label to type | Internal name the code sends | Field type | Holds |
| --- | --- | --- | --- |
| the client service | `site_service` | Single-line text | Which job — one of the dropdown options on the form |
| the client urgency | `site_urgency` | Single-line text | How soon. Empty today; the field exists in the relay and a future form may ask |
| the client lead id | `site_lead_id` | Single-line text | The D1 row id, so a HubSpot record traces back to the lead book |
| the client source page | `site_source_page` | Single-line text | The page the enquiry was submitted from |

**The internal name is the part that matters.** HubSpot derives it from the
label when you create the property, and it is shown under the label field —
click into it and confirm it reads exactly as the middle column above, all
lowercase, underscores, no trailing digit. HubSpot appends a numeric suffix if
a property of that name ever existed and was deleted, which is the most common
way this goes wrong.

Two different failures follow from getting it wrong, and only one of them is
loud:

- **The property does not exist at all** → HubSpot refuses the whole request
  with `400 Property "site_service" does not exist`, the contact is not created,
  and the row sits in D1 as `failed` with that sentence in `crm_error`. Loud,
  diagnosable, and the retry sweep delivers everything the moment you create
  the property.
- **The property exists under a slightly different name** (`site_services`,
  `site_service_1`) → HubSpot accepts everything, the contact is created, and
  the value lands in a property nobody is looking at. Silent. This is why the
  middle column is worth reading twice.

Single-line text for all four, including service. A dropdown would be tidier,
but the service list lives in `client.config.ts → form.serviceOptions` and
changing it there would silently start producing values HubSpot rejects.

Text is also what keeps this to **four** of the ten custom properties. The
other six belong to the client — leave them.

---

## 4. Point the relay at HubSpot

Two settings. One is not a secret and lives in the repo; one is, and never
does.

**a. The adapter**, in `workers/lead-relay/wrangler.toml` — find the
*active* `CRM_ADAPTER` line in `[vars]` and change its value:

```toml
[vars]
CRM_ADAPTER = "hubspot"   # was "generic"
```

> **Change that line; do not uncomment the commented one.** `[vars]` carries
> both a commented `# CRM_ADAPTER = "hubspot"` in the explanatory block and a
> live `CRM_ADAPTER = "generic"` further down. Uncommenting the first while
> the second is still there puts the same key twice in one TOML table, which
> is a parse error rather than a configuration — wrangler refuses the file
> before it gets as far as deploying.

**b. The key**, as a Worker secret — but note the order, which is the
opposite of what feels natural:

```bash
cd workers/lead-relay
npx wrangler deploy                                  # FIRST — creates the Worker
npx wrangler secret put CRM_AUTH_TOKEN      # then paste the key at the prompt
```

> **Deploy first.** A secret is attached to a Worker, so there is nothing to
> attach one to until the Worker exists. Running `secret put` first gets you
> *"There doesn't seem to be a Worker called client-lead-relay. Do you want to
> create a new Worker with that name?"* — say **no** to that and deploy
> properly instead. Saying yes creates a placeholder Worker with no code in it,
> which then answers every form submission with an error until the real deploy
> lands on top.
>
> And `wrangler deploy` itself will not work until D1 exists: `wrangler.toml`
> ships with `database_id = "<paste the id wrangler prints>"`, which is not an
> id. Run `npx wrangler d1 create client-leads`, paste the real id in, then
> `npm run schema`. The relay README has the full first-deploy sequence.

> **`secret put` takes the NAME, not the value.** `CRM_AUTH_TOKEN` is the
> argument; the key itself goes in at the hidden prompt that follows. Passing
> the key as the argument creates a secret *named* after your key — and puts a
> live credential into your shell history, where `Get-History` or `.bash_history`
> will hand it to the next person who looks. If that happens, rotate the key in
> HubSpot before doing anything else; it is a thirty-second fix and the
> alternative is a credential you cannot un-leak.

> **Do not pass `--env`.** Omitting it targets the top-level environment —
> the production one — which is where these belong. Earlier revisions of this
> guide said to pass `--env=""` to mean that explicitly; wrangler rejects it
> outright, with *No environment found in configuration with name ""*, and on
> PowerShell the quotes are stripped before wrangler sees them in any case.
>
> Confirm where a secret landed rather than assuming, since the failure is a
> Worker that reads an empty value at runtime:
>
> ```bash
> npx wrangler secret list          # the top-level environment
> npx wrangler secret list --env dev
> ```

That is the whole integration. `CRM_WEBHOOK_URL` is not used by this adapter
and can stay unset; leaving it set does nothing, and switching `CRM_ADAPTER`
back to `generic` re-enables it, which is the fastest way to fall back if
HubSpot has to come out in a hurry.

**Job applications are not forwarded**, on purpose. A sales contact list is not
an applicant tracker: applicants distort every "here are your leads" view,
consume the same contact allowance as customers, and carry a different
retention promise than customers do — the résumé side of this system commits to
twelve months and HubSpot knows nothing about that. They are stored in D1 and
appear in `/export.csv` either way. To send them anyway:

```toml
CRM_FORWARD_APPLICATIONS = "true"
```

Note that this does **not** backfill: applications captured while it was off
are recorded as `crm_status='skipped'`, which the retry sweep deliberately
leaves alone so a pile of old applications cannot starve the leads behind them.
To send the ones already stored, one statement:

```bash
npx wrangler d1 execute client-leads --remote \
  --command "UPDATE leads SET crm_status='pending' WHERE crm_status='skipped';"
```

---

## 5. Verify a real lead lands

Do this on the **preview** deployment before production, and use a real address
you can check — a bad token and a missing property look identical from the
front of the site, because the form does not depend on any of this.

> **First, put the preview origin in the relay's `ALLOWED_ORIGINS`** and
> redeploy the Worker. `wrangler.toml` ships with the two production
> hostnames only, so `/lead` refuses a preview submission with a 403 — and
> because the contact form never awaits that request, the form still says it
> sent and the email still arrives. You would read the empty result below as
> a HubSpot problem and go looking in the wrong place. The comment above
> `ALLOWED_ORIGINS` has the exact hostname to add.
>
> To skip the front end entirely, curl the route instead: a request with no
> `Origin` header passes the check by design, since the check exists to stop
> another *website* posting on a visitor's behalf.
>
> ```bash
> curl -X POST https://<the-relay-hostname>/lead \
>   -H 'Content-Type: application/json' \
>   -d '{"name":"Test Person","email":"you@example.com","phone":"3375550113",
>        "address":"1 Test St","service":"Roof replacement","message":"test"}'
> ```

**1. Submit the form.** `/contact/` on the preview site. Name, phone, an email
you own, address, and something recognisable in the message box.

**2. The form should say it sent.** If it did not, the problem is Web3Forms or
`NEXT_PUBLIC_WEB3FORMS_KEY`, not HubSpot — the CRM is downstream of the reply
the visitor gets, deliberately.

**3. Check the row, which is the thing that must exist:**

```bash
cd workers/lead-relay
npx wrangler d1 execute client-leads --remote --command \
  "SELECT received_at, email, crm_status, crm_attempts, substr(crm_error,1,120) AS err
     FROM leads ORDER BY received_at DESC LIMIT 3;"
```

| `crm_status` | What it means |
| --- | --- |
| `sent` | HubSpot accepted it. Go to step 5 |
| `pending` | Stored, forward not finished — wait fifteen minutes for the sweep and look again |
| `failed` | HubSpot refused. `err` says why; section 6 |
| `disabled` | The Worker does not think a CRM is configured. The token is missing, or `CRM_ADAPTER` is misspelled — check the Worker's log |
| `skipped` | It is an application, and applications are not forwarded (section 4) |

**4. The same thing through the export**, if you would rather not touch D1 —
this is also the check that proves `EXPORT_TOKEN` works:

```bash
curl -sS -H "Authorization: Bearer $EXPORT_TOKEN" \
  https://<the-relay-hostname>/export.csv | head -3
```

**5. Check HubSpot.** **Contacts** → sort by **Create date**. The contact
should be there with:

- first and last name split off the one name field,
- the phone, the address and the message,
- **Lead status: New**,
- and the four `the client …` properties filled in — open the record, **View all
  properties**, and search `site_`. If those four are empty but everything else
  is right, the internal names are wrong. Section 3.

**6. Submit a second lead with the same email address.** This is the one people
skip and it is the one that matters: HubSpot must show **one** contact,
updated, not two. If it shows two, section 6.

---

## 6. Troubleshooting

The `crm_error` column holds HubSpot's own words, truncated. It is almost
always enough.

| What you see | Cause | Fix |
| --- | --- | --- |
| `401 … NOT TRANSIENT` | The key is wrong, rotated, or from a different portal | Re-copy it from the service key (section 2) and `wrangler secret put CRM_AUTH_TOKEN` again. Retrying will not fix it — the row will sit failed until the key is right, then the sweep delivers it |
| `403` with a scope message | The key is missing `crm.objects.contacts.read` or `.write` | Add the scope to the key (section 2). If the scope is greyed out, your own login lacks it — a key cannot be granted more than its creator has. On a legacy private app, changing scopes issues a **new token**, so set the secret again |
| `400 Property "site_…" does not exist` | The property was not created, or its internal name differs | Create it exactly as section 3 says. Nothing is lost; the next sweep delivers the backlog |
| `429 throttled by HubSpot, will retry` | Rate limited | Nothing. This does not count against the six-attempt budget and the sweep retries in fifteen minutes |
| Row says `sent`, no contact in HubSpot | Almost always the wrong portal — two HubSpot accounts, key from the other one | Check the portal ID in the account menu against the one you created the key in |
| Duplicate contacts for the same person | The lead had no email, so it matched on phone — and HubSpot's stored number is formatted differently from what the visitor typed (`(337) 555-0113` vs `3375550113`). The search is an exact string match | Merge the two in HubSpot. This cannot happen for a lead submitted through the current form, which requires an email; it is a risk for rows captured before that and for applications |
| Everything `disabled` | No token, or `CRM_ADAPTER` is misspelled — a value that names no adapter is treated as *no CRM* rather than falling back to the generic webhook, so a typo cannot post leads somewhere unintended | `npx wrangler tail` and look for the `CRM_ADAPTER="…" is not one of` line |
| No **Service Keys** menu in settings | The login lacks **Developer tools access** or a Developer Seat — far more common than an account problem | Grant it from **Settings → Users & Teams**, or sign in as the account owner. Section 2 |
| `crm_attempts` stuck at 6 | Six refusals; the relay stops rather than hammering a configuration problem forever | Fix the cause, then `UPDATE leads SET crm_status='pending', crm_attempts=0 WHERE crm_status='failed';` |

Live logs, while testing: `cd workers/lead-relay && npx wrangler tail`.

---

## 7. Moving off HubSpot later

When the client picks JobNimbus, AccuLynx or anything else, the work is:

1. **Write one adapter.** A file in `workers/lead-relay/src/crm/` exporting a
   `CrmAdapter` — `configured`, `accepts`, `send` — and one line adding it to
   `ADAPTERS` in `src/crm/index.ts`. `hubspot.ts` is the worked example,
   including the parts that are genuinely fiddly: deduplication before the
   write, a conflict treated as an update, and a throttle that must not spend
   one of the six retry attempts.
2. **Change two variables.** `CRM_ADAPTER` in `wrangler.toml`, and
   `CRM_AUTH_TOKEN` via `wrangler secret put`.
3. **Backfill from the export.** `/export.csv` is the entire history, in one
   file, including everything HubSpot never saw. Most CRMs import a CSV.

What does not change: the forms, the site, the database, the retry sweep, the
`/export.csv` route, or anything in `src/index.ts`. That was the point of
storing first and forwarding second.

If the new CRM takes a webhook rather than an API — many of them do, via Zapier
or Make — there is nothing to write at all: set `CRM_ADAPTER` back to
`generic` and point `CRM_WEBHOOK_URL` at it.

**Leaving HubSpot behind properly:** delete the service key — or the private
app, if the fallback in section 2 was used — which invalidates the token
immediately. Then export or delete the contacts if the client is not keeping
the account, and take HubSpot back out of the privacy policy's processor list.
A dormant free account holding customer data is a disclosure obligation nobody
is thinking about a year later.

---

## Appendix. Where the credential dates come from

HubSpot's deprecation timeline is the one part of this guide with an expiry
date on it, so here is the source, checked **22 September 2026**:

- [Legacy Private App Creation Being Disabled](https://developers.hubspot.com/changelog/legacy-private-app-creation-sunset)
  — the 28 September / 26 October 2026 dates, and the statement that existing
  private apps are not being revoked.
- [Service Keys enter public beta](https://developers.hubspot.com/changelog/service-keys)
  — public beta since February 2026, available on all hubs and tiers.
- [Make API requests using a service key](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/account-service-keys)
  — the UI path, the scope model, and `Authorization: Bearer …` usage.

**Confirmed since:** a real service key issued from a the client portal carries the
form `pat-na2-` followed by a UUID — so service keys *do* use the same `pat-`
prefix a private app token does, with a region segment (`na1`, `na2`, …) that
varies by where the portal lives. Do not treat the prefix as a way to tell the
two credentials apart; they are interchangeable here regardless.

Still unconfirmed, and nothing here depends on it: whether the public beta has
gone GA. If the Service Keys screen looks different from section 2, trust the
screen and update this file.

