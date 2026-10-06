# Web3Forms setup — how a lead reaches the office inbox

The contact form posts straight from the visitor's browser to Web3Forms,
which emails the enquiry to the client's inbox. No Worker, no server, no build step
of ours in between.

This is the revenue path. If it is broken the business is not taking work,
and unlike everything else in this repository it has no fallback — so this
file covers the whole of it: getting the key, proving it works, proving it
*fails honestly*, and what to do when the inbox goes quiet.

Everything Web3Forms-specific is one variable and one file:
`NEXT_PUBLIC_WEB3FORMS_KEY`, read by `site/lib/submitContact.ts`.

---

## 0. What this is, and what it is not

**Why a hosted form service and not our own endpoint.** The site is a static
export, so taking a form submission needs *something* server-side. We already
run two Workers, and putting a third in front of the contact form was
considered and rejected: it would add a thing of ours that can fail at 2am, in
exchange for hardening a form whose worst realistic outcome is spam in an
inbox. A static page posting to a hosted form service has almost nothing that
can break — no deploy of ours, no runtime of ours, no secret of ours to
expire. The reasoning is written out at the top of `lib/submitContact.ts`.

**The access key is public, on purpose.** It is compiled into the JavaScript
the browser downloads, because that is how Web3Forms is designed to work: the
key names a destination inbox and grants no account access. The exposure is
"someone can post to the office inbox", not "someone can read the account".

Publishable is not the same as private, though. If the key starts drawing
spam, rotate it (section 8) and turn on their spam protection (section 4)
before reaching for anything more elaborate.

**What it does not do:** it does not store anything, and it is not a list you
can work through. That is what `workers/lead-relay` is for — it takes a second
copy of every enquiry and forwards it to the CRM. The two are independent on
purpose, and the relay is downstream: a relay or CRM outage cannot cost the
email or show the customer an error. See `workers/lead-relay/README.md`.

**Check the current free-tier submission cap before launch.** Web3Forms
changes its packaging, and this is the one limit that matters here: a cap hit
mid-month is lost leads, and it is not a failure the site can see or report.
If the client's volume is anywhere near it, that is a paid plan rather than a risk
to carry.

---

## 1. Create the access key

1. Go to <https://web3forms.com> and enter the address the enquiries should
   land in.
2. **Use the client's own office inbox**, not the developer's and not a personal account.
   Whoever receives this mail receives the leads; the same ownership rule as
   the Cloudflare, Sanity and CRM accounts in
   `docs/LAUNCH-CREDENTIALS.md` §2.
3. The access key arrives by email. It is a UUID.

> **Use a mailbox somebody actually watches**, and preferably a shared one
> rather than one person's. A lead sitting unread in an ex-employee's inbox
> is the failure mode this whole path exists to prevent, and it is not one
> any amount of code can detect.

Consider creating it against a distribution address (`office@`, `leads@`)
that forwards to whoever is on duty. Changing who reads the leads is then a
mail-routing change rather than a new key and a site rebuild.

---

## 2. Set it locally

```bash
cd site
cp .env.example .env.local     # if you have not already
```

Then fill in the one required line:

```
NEXT_PUBLIC_WEB3FORMS_KEY=<the key from the email>
```

```bash
npm run dev                    # http://localhost:3000/contact/
```

Web3Forms does not restrict by origin on the default plan, so localhost
submits real enquiries and sends real email. That means **the whole
integration is testable on your own machine** — there is no need to wait for
a Cloudflare preview deployment to prove this one works.

> **`.env.local` is the one place build configuration lives**, on every
> platform. Next reads it for `NEXT_PUBLIC_*`, and the standalone Node
> scripts either side of it — `gallery.mjs`, `csp.mjs`, `harden.mjs` — read
> it through `scripts/env-file.mjs`. So there is nothing to `export`, and
> no PowerShell-versus-bash syntax to get right.
>
> A real environment variable wins over the file if one is set, which is
> what keeps a Cloudflare build authoritative; and an empty assignment
> counts as unset, so the placeholder lines `.env.example` ships do not
> shadow a value you add later.

---

## 3. The two tests

Both. The second one is the one people skip, and it is the one that catches
the failure this form is shaped to avoid.

### The success case

Submit `/contact/` with real values and confirm the mail arrives. Check it
looks like something a person can act on — see section 6 for what to expect.

Reply to the notification and confirm the reply goes to the *customer*, not
to Web3Forms. The form sends the visitor's address in a field named `email`,
which Web3Forms reads as the reply-to for exactly this reason.

### The failure case

Change the key in `.env.local` to something wrong, restart `npm run dev`, and
submit again. The visitor must see:

> We couldn't send that. Please call us instead — we don't want to lose your
> request.

…and the phone number. **Not** a success message.

This is worth testing rather than assuming, because Web3Forms answers **HTTP
200 with `{"success": false}`** for its own rejections — a bad key, a spam
heuristic, a plan limit. Any code that trusts the status line alone reports
success and drops the lead. `submitContact.ts` checks the body for this, and
an earlier version of this site did not: it shipped looking fine and quietly
lost every lead it took.

Do the same test with the key **empty**, which is the state a misconfigured
Cloudflare environment produces. `contactConfigured()` catches that one before
any request is made, and the console says why.

Put the real key back afterwards.

---

## 4. Turn on spam protection

Do this before launch, not after the first wave.

The site's only defence today is a honeypot: a hidden `company` field in
`components/Contact.tsx`. If it is filled, `submitContact.ts` reports success
to the bot and sends nothing anywhere — so the bot does not learn it was
caught. That stops naive scripted spam and nothing else.

> Note this is *our* honeypot and it never leaves the browser. It is not
> Web3Forms' own `botcheck` convention, and the two do not interact.

In the Web3Forms dashboard, switch on their spam protection. They offer their
own filtering and a captcha option; the menu names move, so trust the
dashboard over this paragraph.

If spam gets past it, the order of escalation is: their spam protection →
rotate the key (section 8) → a captcha on the form. Do not reach for the last
one first. Every challenge added to a contact form costs some real enquiries,
and a contact form is often filled in on a phone, in a hurry, by someone
with a problem they want fixed.

---

## 5. Get the key into the deployed site

Which half of this applies depends on how the site is being deployed, and the
two put the key in completely different places.

### On the terminal preview — it is already done

`npm run preview:deploy` is `wrangler pages deploy out`: a **direct upload**.
The build runs on your machine and Cloudflare receives the finished `out/`
directory, so **the key in your `.env.local` is the key that ships**. There is
nothing to mirror, and setting `NEXT_PUBLIC_WEB3FORMS_KEY` in the Pages
dashboard does nothing — Cloudflare never builds this project, and a static
export with no Pages Functions has no runtime there to read a variable.

Which also means the reverse: **the key is compiled into whatever you last
deployed.** Changing `.env.local` changes nothing on the preview URL until you
deploy again.

The one thing worth watching is that a key belonging to a personal test inbox
is just as deployable as the real one. Before a preview goes anywhere near the
client, submit the form on it and confirm the mail lands where the client will be
reading it.

### On a Git-connected Pages project — mirror it

This is example.com after the domain migration. Cloudflare clones the repo and
runs the build itself, so it needs the key:

**Settings → Environment variables, for Production *and* Preview.** A preview
missing the key behaves differently from production, which defeats the point
of checking anything there.

```
NEXT_PUBLIC_WEB3FORMS_KEY = <the key>
```

**This is a static export, so the value is compiled in at build time.**
Setting the variable does not change the deployed site — it changes the *next*
build. Redeploy after setting it, and after any change to it.

Unset in Cloudflare, the deployed form refuses every submission and shows the
phone number, exactly as in section 3. That is the designed failure and the
site is safe to ship that way; it just cannot take a lead.

---

## 6. What the office actually receives

From `lib/submitContact.ts`, each notification carries:

| Field | Where it comes from |
| --- | --- |
| `subject` | `[<urgency>] Request — <name>` — urgency leads so the office can triage from the inbox list |
| `from_name` | `client.config.ts → businessName` |
| `name`, `phone`, `email` | The form. All three are required |
| `address` | The property the work is for. Required |
| `service` | One of `client.config.ts → form.serviceOptions` |
| `urgency` | One of `client.config.ts → form.urgencyOptions`. Required |
| `message` | Free text, optional |
| `source` | The page URL the enquiry was submitted from |
| `submittedAt` | ISO timestamp |

Empty fields are dropped before sending, so the email has no blank rows.

Every value is scrubbed of control characters and collapsed to single spaces
first. That is for the benefit of whoever reads the mail — a name with a
carriage return in it arrives as one inert line rather than something
header-shaped — and explicitly **not** a security control. Anything a browser
checks can be skipped by not using a browser; Web3Forms is the side that has
to be robust to what it is sent.

---

## 7. Troubleshooting

| What you see | Cause | Fix |
| --- | --- | --- |
| Form shows "call us instead" | The key is missing, wrong, or rejected | Check the browser console — `contactConfigured()` logs the unset case by name, and a rejection logs Web3Forms' own response body |
| Nothing arrives, form says it sent | Almost always the spam folder on the first send | Check it, then mark as not-spam. If genuinely nothing: confirm the key is for the inbox you are watching |
| Arrives locally, not from the deployed site | On a Git-connected project: the Cloudflare variable is unset, set on one environment only, or set after the last build. On the terminal preview: you changed `.env.local` and did not redeploy | Section 5. Either way the key is baked in at build time, so the fix ends in a rebuild |
| Reply goes to Web3Forms, not the customer | The `email` field did not reach them | It is required on the form, so this means the payload was altered. Check `submitContact.ts` |
| Suddenly stopped, nothing changed | Monthly plan limit, or the key was rotated | Check the dashboard's usage. This failure is invisible from the site |
| Spam arriving | The honeypot alone is not enough | Section 4 |
| Submissions work, no rows in the relay | Unrelated to Web3Forms — the two paths are independent | `NEXT_PUBLIC_LEAD_WEBHOOK_URL`, and the relay's `ALLOWED_ORIGINS`. See `workers/lead-relay/README.md` |

The last row is worth reading twice. The relay call is fired in parallel and
deliberately never awaited, so **a relay that is refusing every request looks
identical to one that is working** from the front of the site. The email
arriving proves Web3Forms, and nothing else.

---

## 8. Rotating the key, and moving off later

**To rotate:** get a new key from the Web3Forms dashboard, set it in
`.env.local` and in Cloudflare (Production and Preview), redeploy, and test
per section 3. The old key stops working when they revoke it, so there is a
window where both are live — rotate, verify, then revoke.

**To move to another provider** (Formspree, Getform, or a Worker of our own):
set `NEXT_PUBLIC_FORM_ENDPOINT` to the new URL. It defaults to
`https://api.web3forms.com/submit` and exists for exactly this. Two things to
check before assuming it is a one-variable change:

1. **The CSP.** `scripts/csp.mjs` builds `connect-src` from the endpoint
   variables at build time, so a new origin is allowed automatically — but
   only on a build where the variable is set. Set it, then build.
2. **The response contract.** `submitContact.ts` treats `{success: false}` as
   a rejection and anything else 2xx as accepted. A provider that signals
   failure differently needs that check updated, or the site goes back to
   reporting false success.

**And the privacy policy.** `app/privacy/page.tsx` names Web3Forms as a
processor. Changing provider means changing that line in the same commit —
the file's header comment says so, and it is not a formality.

---

## Where the rest of it lives

| | |
| --- | --- |
| The variable, and every other one | `site/.env.example` |
| The code, and why it is shaped this way | `site/lib/submitContact.ts` |
| The form itself | `site/components/Contact.tsx` |
| Who creates the account | `docs/LAUNCH-CREDENTIALS.md` §2 |
| The second copy of the lead | `workers/lead-relay/README.md` |
| The pre-cutover checklist | `README-DEPLOY.md` §9 |
